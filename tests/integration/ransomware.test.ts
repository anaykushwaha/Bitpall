import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSourceFile } from "@bitpall/ast";
import { check } from "@bitpall/checker";
import { interpret, validateMockEvents } from "@bitpall/interpreter";
import { lex } from "@bitpall/lexer";
import { parse } from "@bitpall/parser";
import { runBitpallTests } from "@bitpall/test-runner";
import { describe, expect, it } from "vitest";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const exampleRoot = resolve(repoRoot, "examples/exploit-to-ransomware");

interface ExpectedResult {
  matchedRules: string[];
  confidence: number;
  sources: number;
  matchedEventIds: string[];
  testsPassed: boolean;
  tests: Array<{
    testName: string;
    passed: boolean;
    assertions: Array<{ ruleName: string; passed: boolean }>;
  }>;
  simulatedActions: Array<{ type: string; target?: string; status: string }>;
  pendingApprovals: Array<{ type: string; status: string }>;
  rollbackActions: Array<{ type: string; target?: string; status: string }>;
}

function loadPolicy() {
  const policyText = readFileSync(resolve(exampleRoot, "policy.bitpall"), "utf8");
  const source = createSourceFile("policy.bitpall", policyText);
  const lexed = lex(source);
  expect(lexed.diagnostics.filter((d) => d.severity === "error")).toEqual([]);
  const parsed = parse(source);
  expect(parsed.diagnostics.filter((d) => d.severity === "error")).toEqual([]);
  expect(parsed.program).not.toBeNull();
  const checked = check(parsed.program!, source);
  expect(checked.diagnostics.filter((d) => d.severity === "error")).toEqual([]);
  return checked.program;
}

function loadEvents(fileName: string) {
  const raw: unknown = JSON.parse(readFileSync(resolve(exampleRoot, fileName), "utf8"));
  const validated = validateMockEvents(raw);
  expect(validated.ok).toBe(true);
  return validated.events;
}

describe("exploit-to-ransomware integration", () => {
  it("runs the full pipeline including event validation and test-runner", () => {
    const program = loadPolicy();
    const events = loadEvents("events.json");
    const expected = JSON.parse(
      readFileSync(resolve(exampleRoot, "expected-result.json"), "utf8"),
    ) as ExpectedResult;

    const source = createSourceFile(
      "policy.bitpall",
      readFileSync(resolve(exampleRoot, "policy.bitpall"), "utf8"),
    );
    const lexed = lex(source);
    expect(lexed.tokens.length).toBeGreaterThan(10);

    const testResult = runBitpallTests({ program, events });
    expect(testResult.passed).toBe(expected.testsPassed);
    expect(testResult.tests.map((t) => t.testName)).toEqual(expected.tests.map((t) => t.testName));

    const matched = testResult.interpretResult.ruleResults
      .filter((r) => r.matched)
      .map((r) => r.ruleName);
    expect(matched).toEqual(expected.matchedRules);

    const rule = testResult.interpretResult.ruleResults.find(
      (r) => r.ruleName === "suspicious_encryption_chain",
    );
    expect(rule?.confidence).toBe(expected.confidence);
    expect(rule?.sources).toBe(expected.sources);
    expect(rule?.matchedEventIds).toEqual(expected.matchedEventIds);

    expect(rule?.stageExplanations).toHaveLength(2);
    expect(rule?.stageExplanations[0]?.conditions.some((c) => c.field === "process.name")).toBe(
      true,
    );
    expect(rule?.requirementEvaluations.every((r) => r.passed)).toBe(true);

    for (const action of expected.simulatedActions) {
      expect(
        testResult.interpretResult.auditLog.some(
          (entry) =>
            entry.result.action.type === action.type &&
            entry.result.status === action.status &&
            (action.target === undefined || entry.result.action.target === action.target),
        ),
      ).toBe(true);
    }

    for (const pending of expected.pendingApprovals) {
      expect(
        testResult.interpretResult.pendingApprovals.some(
          (entry) => entry.action.type === pending.type && entry.status === pending.status,
        ),
      ).toBe(true);
    }

    for (const rollback of expected.rollbackActions) {
      expect(
        testResult.interpretResult.rollbackActions.some(
          (entry) =>
            entry.action.type === rollback.type &&
            entry.status === rollback.status &&
            (rollback.target === undefined || entry.action.target === rollback.target),
        ),
      ).toBe(true);
    }
  });

  it("does not match an incomplete chain without encryption", () => {
    const result = interpret(loadPolicy(), loadEvents("events-incomplete.json"));
    expect(result.ruleResults[0]?.matched).toBe(false);
    expect(result.auditLog).toHaveLength(0);
  });

  it("does not match non-encrypted file writes", () => {
    const result = interpret(loadPolicy(), loadEvents("events-no-encryption.json"));
    expect(result.ruleResults[0]?.matched).toBe(false);
  });

  it("does not match when confidence is below the requirement", () => {
    const result = interpret(loadPolicy(), loadEvents("events-low-confidence.json"));
    expect(result.ruleResults[0]?.matched).toBe(false);
    expect(result.ruleResults[0]?.reason).toMatch(/confidence/i);
    expect(result.ruleResults[0]?.requirementEvaluations.some((r) => !r.passed)).toBe(true);
  });
});
