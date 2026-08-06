import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSourceFile } from "@aegisscript/ast";
import { check } from "@aegisscript/checker";
import { interpret, type MockSecurityEvent } from "@aegisscript/interpreter";
import { lex } from "@aegisscript/lexer";
import { parse } from "@aegisscript/parser";
import { describe, expect, it } from "vitest";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

interface ExpectedResult {
  matchedRules: string[];
  confidence: number;
  sources: number;
  matchedEventIds: string[];
  simulatedActions: Array<{ type: string; target?: string; status: string }>;
  pendingApprovals: Array<{ type: string; status: string }>;
  rollbackActions: Array<{ type: string; target?: string; status: string }>;
}

describe("exploit-to-ransomware integration", () => {
  it("lexes, parses, checks, and simulates the example", () => {
    const exampleRoot = resolve(repoRoot, "examples/exploit-to-ransomware");
    const policyText = readFileSync(resolve(exampleRoot, "policy.aegis"), "utf8");
    const events = JSON.parse(
      readFileSync(resolve(exampleRoot, "events.json"), "utf8"),
    ) as MockSecurityEvent[];
    const expected = JSON.parse(
      readFileSync(resolve(exampleRoot, "expected-result.json"), "utf8"),
    ) as ExpectedResult;

    const source = createSourceFile("policy.aegis", policyText);
    const lexed = lex(source);
    expect(lexed.diagnostics.filter((d) => d.severity === "error")).toEqual([]);
    expect(lexed.tokens.length).toBeGreaterThan(10);

    const parsed = parse(source);
    expect(parsed.diagnostics.filter((d) => d.severity === "error")).toEqual([]);
    expect(parsed.program).not.toBeNull();

    const checked = check(parsed.program!, source);
    expect(checked.diagnostics.filter((d) => d.severity === "error")).toEqual([]);

    const result = interpret(checked.program, events);
    const matched = result.ruleResults.filter((r) => r.matched).map((r) => r.ruleName);
    expect(matched).toEqual(expected.matchedRules);

    const rule = result.ruleResults.find((r) => r.ruleName === "suspicious_encryption_chain");
    expect(rule?.confidence).toBe(expected.confidence);
    expect(rule?.sources).toBe(expected.sources);
    expect(rule?.matchedEventIds).toEqual(expected.matchedEventIds);

    for (const action of expected.simulatedActions) {
      expect(
        result.auditLog.some(
          (entry) =>
            entry.result.action.type === action.type &&
            entry.result.status === action.status &&
            (action.target === undefined || entry.result.action.target === action.target),
        ),
      ).toBe(true);
    }

    for (const pending of expected.pendingApprovals) {
      expect(
        result.pendingApprovals.some(
          (entry) => entry.action.type === pending.type && entry.status === pending.status,
        ),
      ).toBe(true);
    }

    for (const rollback of expected.rollbackActions) {
      expect(
        result.rollbackActions.some(
          (entry) =>
            entry.action.type === rollback.type &&
            entry.status === rollback.status &&
            (rollback.target === undefined || entry.action.target === rollback.target),
        ),
      ).toBe(true);
    }
  });
});
