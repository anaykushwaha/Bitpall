import type { ProgramNode } from "@aegisscript/ast";
import {
  interpret,
  type InterpretOptions,
  type InterpretResult,
  type MockSecurityEvent,
} from "@aegisscript/interpreter";

export interface TestRunRequest {
  readonly program: ProgramNode;
  readonly events: readonly MockSecurityEvent[];
  readonly interpretOptions?: InterpretOptions;
}

export interface TestAssertionResult {
  readonly kind: "rule_match";
  readonly ruleName: string;
  readonly expected: true;
  readonly actual: boolean;
  readonly passed: boolean;
  readonly message: string;
}

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

/**
 * Execute AegisScript `test` declarations against validated mock events.
 * Runs the interpreter once, then evaluates `expect rule … to_match` assertions.
 */
export function runAegisTests(request: TestRunRequest): TestRunResult {
  const interpretResult = interpret(
    request.program,
    request.events,
    request.interpretOptions ?? {},
  );

  const matchedRules = new Map<string, boolean>();
  for (const result of interpretResult.ruleResults) {
    matchedRules.set(result.ruleName, result.matched);
  }

  const tests: TestCaseResult[] = [];

  for (const workspace of request.program.workspaces) {
    for (const member of workspace.members) {
      if (member.kind !== "TestDeclaration") continue;

      const assertions: TestAssertionResult[] = [];
      for (const statement of member.statements) {
        if (statement.kind !== "ExpectRuleMatch") continue;
        const ruleName = statement.ruleName.name;
        const actual = matchedRules.get(ruleName) === true;
        assertions.push({
          kind: "rule_match",
          ruleName,
          expected: true,
          actual,
          passed: actual,
          message: actual
            ? `Rule '${ruleName}' matched as expected`
            : `Expected rule '${ruleName}' to match, but it did not`,
        });
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
