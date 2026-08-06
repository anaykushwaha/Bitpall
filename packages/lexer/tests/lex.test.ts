import { createSourceFile } from "@aegisscript/ast";
import { describe, expect, it } from "vitest";
import { lex } from "../src/index.js";

function lexText(text: string, fileName = "test.aegis") {
  return lex(createSourceFile(fileName, text));
}

describe("lexer", () => {
  it("recognizes keywords", () => {
    const { tokens, diagnostics } = lexText(
      "workspace asset telemetry rule observe then within require respond approval rollback test",
    );
    expect(diagnostics).toHaveLength(0);
    const kinds = tokens.filter((t) => t.kind !== "Eof").map((t) => t.kind);
    expect(kinds.every((k) => k === "Keyword")).toBe(true);
  });

  it("recognizes identifiers", () => {
    const { tokens } = lexText("finance_laptop process_start");
    expect(tokens[0]).toMatchObject({ kind: "Identifier", lexeme: "finance_laptop" });
    expect(tokens[1]).toMatchObject({ kind: "Identifier", lexeme: "process_start" });
  });

  it("recognizes string literals", () => {
    const { tokens, diagnostics } = lexText('"powershell.exe" "high"');
    expect(diagnostics).toHaveLength(0);
    expect(tokens[0]).toMatchObject({ kind: "String", value: "powershell.exe" });
    expect(tokens[1]).toMatchObject({ kind: "String", value: "high" });
  });

  it("recognizes numbers", () => {
    const { tokens } = lexText("2 0.80 10");
    expect(tokens[0]).toMatchObject({ kind: "Number", value: 2 });
    expect(tokens[1]).toMatchObject({ kind: "Number", value: 0.8 });
    expect(tokens[2]).toMatchObject({ kind: "Number", value: 10 });
  });

  it("recognizes durations", () => {
    const { tokens, diagnostics } = lexText("30s 5m 1h 2m");
    expect(diagnostics).toHaveLength(0);
    expect(tokens.map((t) => t.lexeme).filter(Boolean)).toEqual(["30s", "5m", "1h", "2m"]);
    expect(tokens.slice(0, 4).every((t) => t.kind === "Duration")).toBe(true);
  });

  it("recognizes operators", () => {
    const { tokens } = lexText("== != > >= < <=");
    const ops = tokens.filter((t) => t.kind === "Operator").map((t) => t.lexeme);
    expect(ops).toEqual(["==", "!=", ">", ">=", "<", "<="]);
  });

  it("skips line comments", () => {
    const { tokens, diagnostics } = lexText("workspace // comment\nasset");
    expect(diagnostics).toHaveLength(0);
    expect(tokens.filter((t) => t.kind !== "Eof").map((t) => t.lexeme)).toEqual([
      "workspace",
      "asset",
    ]);
  });

  it("tracks source locations", () => {
    const { tokens } = lexText("a\nb");
    expect(tokens[0]?.range.start).toEqual({ line: 1, column: 1, offset: 0 });
    expect(tokens[1]?.range.start).toEqual({ line: 2, column: 1, offset: 2 });
  });

  it("reports invalid characters", () => {
    const { diagnostics } = lexText("workspace @ foo");
    expect(diagnostics.some((d) => d.code === "AEGIS1001")).toBe(true);
  });

  it("reports unterminated strings", () => {
    const { diagnostics } = lexText('"unterminated');
    expect(diagnostics.some((d) => d.code === "AEGIS1002")).toBe(true);
  });

  it("recognizes booleans", () => {
    const { tokens } = lexText("true false");
    expect(tokens[0]).toMatchObject({ kind: "Boolean", value: true });
    expect(tokens[1]).toMatchObject({ kind: "Boolean", value: false });
  });
});
