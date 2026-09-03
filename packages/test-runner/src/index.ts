import type { ComparisonOperator, ProgramNode } from "@bitpall/ast";
import {
  interpret,
  type InterpretOptions,
  type InterpretResult,
  type MockSecurityEvent,
  type RuleMatchResult,
} from "@bitpall/interpreter";

export interface TestRunRequest {
  readonly program: ProgramNode;
  readonly events: readonly MockSecurityEvent[];
  readonly interpretOptions?: InterpretOptions;
}

export interface RuleMatchAssertionResult {
  readonly kind: "rule_match";
  readonly ruleName: string;
  readonly expected: "match" | "not_match";
  readonly actual: boolean;
  readonly passed: boolean;
  readonly message: string;
}

export interface RuleConfidenceAssertionResult {
  readonly kind: "rule_confidence";
  readonly ruleName: string;
  readonly operator: ComparisonOperator;
  readonly expected: number;
  readonly actual: number;
  readonly passed: boolean;
  readonly message: string;
}

export type TestAssertionResult = RuleMatchAssertionResult | RuleConfidenceAssertionResult;

export interface TestCaseResult {
  readonly workspaceName: string;
  readonly testName: string;
  readonly passed: boolean;
  readonly assertions: readonly TestAssertionResult[];
}

export interface TestRunResult {
  readonly passed: boolean;
  readonly tests: readonly TestCaseResult[];
  readonly interpretResult: InterpretResult;
}

/** Stable workspace-scoped rule identity for assertion lookup. */
export function ruleIdentity(workspaceName: string, ruleName: string): string {
  return `${workspaceName}::${ruleName}`;
}

function compareConfidence(
  actual: number,
  operator: ComparisonOperator,
  expected: number,
): boolean {
  switch (operator) {
    case "==":
      return actual === expected;
    case "!=":
      return actual !== expected;
    case ">":
      return actual > expected;
    case ">=":
      return actual >= expected;
    case "<":
      return actual < expected;
    case "<=":
      return actual <= expected;
  }
}

function formatConfidence(value: number): string {
  return value.toFixed(2);
}

function evaluateMatchAssertion(
  workspaceName: string,
  ruleName: string,
  expectation: "match" | "not_match",
  ruleResult: RuleMatchResult | undefined,
): RuleMatchAssertionResult {
  const actual = ruleResult?.matched === true;
  const qualified = `${workspaceName}::${ruleName}`;
  if (expectation === "match") {
    return {
      kind: "rule_match",
      ruleName,
      expected: "match",
      actual,
      passed: actual,
      message: actual
        ? `Rule '${qualified}' matched as expected`
        : `Expected rule '${qualified}' to match, but it did not`,
    };
  }

  return {
    kind: "rule_match",
    ruleName,
    expected: "not_match",
    actual,
    passed: !actual,
    message: !actual
      ? `Rule '${qualified}' did not match as expected`
      : `Expected rule '${qualified}' not to match, but it matched`,
  };
}

function evaluateConfidenceAssertion(
  workspaceName: string,
  ruleName: string,
  operator: ComparisonOperator,
  expected: number,
  expectedRaw: string,
  ruleResult: RuleMatchResult | undefined,
): RuleConfidenceAssertionResult {
  const actual = ruleResult?.confidence ?? 0;
  const passed = compareConfidence(actual, operator, expected);
  const qualified = `${workspaceName}::${ruleName}`;
  return {
    kind: "rule_confidence",
    ruleName,
    operator,
    expected,
    actual,
    passed,
    message: passed
      ? `Rule '${qualified}' confidence ${formatConfidence(actual)} ${operator} ${expectedRaw} as expected`
      : `Expected rule '${qualified}' confidence ${operator} ${expectedRaw}, but actual confidence was ${formatConfidence(actual)}`,
  };
}

/**
 * Execute Bitpall `test` declarations against validated mock events.
 * Runs the interpreter once, then evaluates expect-rule assertions.
 */
export function runBitpallTests(request: TestRunRequest): TestRunResult {
  const interpretResult = interpret(
    request.program,
    request.events,
    request.interpretOptions ?? {},
  );

  const ruleResults = new Map<string, RuleMatchResult>();
  for (const result of interpretResult.ruleResults) {
    ruleResults.set(ruleIdentity(result.workspaceName, result.ruleName), result);
  }

  const tests: TestCaseResult[] = [];

  for (const workspace of request.program.workspaces) {
    for (const member of workspace.members) {
      if (member.kind !== "TestDeclaration") continue;

      const assertions: TestAssertionResult[] = [];
      for (const statement of member.statements) {
        const ruleName = statement.ruleName.name;
        const key = ruleIdentity(workspace.name.name, ruleName);
        const ruleResult = ruleResults.get(key);

        if (statement.kind === "ExpectRuleMatch") {
          assertions.push(
            evaluateMatchAssertion(
              workspace.name.name,
              ruleName,
              statement.expectation,
              ruleResult,
            ),
          );
        } else if (statement.kind === "ExpectRuleConfidence") {
          assertions.push(
            evaluateConfidenceAssertion(
              workspace.name.name,
              ruleName,
              statement.operator,
              statement.value.value,
              statement.value.raw,
              ruleResult,
            ),
          );
        }
      }

      tests.push({
        workspaceName: workspace.name.name,
        testName: member.name.name,
        passed: assertions.every((a) => a.passed),
        assertions,
      });
    }
  }

  return {
    passed: tests.every((t) => t.passed),
    tests,
    interpretResult,
  };
}
