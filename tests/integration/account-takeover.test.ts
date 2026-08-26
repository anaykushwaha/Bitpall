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
const exampleRoot = resolve(repoRoot, "examples/account-takeover");

interface ExpectedResult {
  matchedRules: string[];
  confidence: number;
  sources: number;
  matchedEventIds: string[];
  testsPassed: boolean;
  simulatedActions: Array<{ type: string; target?: string; status: string }>;
  pendingApprovals: Array<{ type: string; target?: string; status: string }>;
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

describe("account-takeover integration", () => {
  it("matches the positive identity compromise chain and keeps disable pending", () => {
    const program = loadPolicy();
    const events = loadEvents("events.json");
    const expected = JSON.parse(
      readFileSync(resolve(exampleRoot, "expected-result.json"), "utf8"),
    ) as ExpectedResult;

    const testResult = runBitpallTests({ program, events });
    expect(testResult.passed).toBe(expected.testsPassed);

    const matched = testResult.interpretResult.ruleResults
      .filter((r) => r.matched)
      .map((r) => r.ruleName);
    expect(matched).toEqual(expected.matchedRules);

    const rule = testResult.interpretResult.ruleResults.find(
      (r) => r.ruleName === "account_takeover_chain",
    );
    expect(rule?.confidence).toBe(expected.confidence);
    expect(rule?.sources).toBe(expected.sources);
    expect(rule?.matchedEventIds).toEqual(expected.matchedEventIds);

    expect(rule?.stageExplanations.length).toBeGreaterThan(0);
    expect(rule?.requirementEvaluations.every((evaluation) => evaluation.passed)).toBe(true);

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
          (entry) =>
            entry.action.type === pending.type &&
            entry.status === pending.status &&
            (pending.target === undefined || entry.action.target === pending.target),
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

  it("does not match a benign login stream", () => {
    const result = interpret(loadPolicy(), loadEvents("events-benign.json"));
    expect(result.ruleResults[0]?.matched).toBe(false);
    expect(result.auditLog).toHaveLength(0);
  });

  it("does not match when MFA is outside the within window", () => {
    const result = interpret(loadPolicy(), loadEvents("events-outside-window.json"));
    expect(result.ruleResults[0]?.matched).toBe(false);
  });

  it("does not match when confidence is below the requirement", () => {
    const result = interpret(loadPolicy(), loadEvents("events-low-confidence.json"));
    expect(result.ruleResults[0]?.matched).toBe(false);
    expect(result.ruleResults[0]?.reason).toMatch(/confidence/i);
    expect(result.ruleResults[0]?.requirementEvaluations.some((r) => !r.passed)).toBe(true);
  });
});
