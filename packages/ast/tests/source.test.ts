import { describe, expect, it } from "vitest";
import { createSourceFile, formatDiagnostic, positionAt, rangeOf } from "../src/index.js";

describe("source model", () => {
  it("tracks line and column for multi-line text", () => {
    const text = "abc\ndef\ng";
    expect(positionAt(text, 0)).toEqual({ line: 1, column: 1, offset: 0 });
    expect(positionAt(text, 4)).toEqual({ line: 2, column: 1, offset: 4 });
    expect(positionAt(text, 6)).toEqual({ line: 2, column: 3, offset: 6 });
  });

  it("builds ranges from offsets", () => {
    const text = "hello\nworld";
    const range = rangeOf(text, 6, 11);
    expect(range.start).toEqual({ line: 2, column: 1, offset: 6 });
    expect(range.end).toEqual({ line: 2, column: 6, offset: 11 });
  });

  it("creates source files", () => {
    const file = createSourceFile("policy.bitpall", "workspace x {}");
    expect(file.fileName).toBe("policy.bitpall");
    expect(file.text).toContain("workspace");
  });
});

describe("diagnostics", () => {
  it("formats diagnostics with location", () => {
    const message = formatDiagnostic({
      code: "BITPALL1001",
      severity: "error",
      message: "Invalid character",
      fileName: "policy.bitpall",
      range: rangeOf("x", 0, 1),
    });
    expect(message).toBe("policy.bitpall:1:1: error BITPALL1001: Invalid character");
  });
});
