/**
 * Planned package: replayable AegisScript `test` declarations against fixtures.
 *
 * Current status: scaffold only. Integration coverage currently lives in
 * `tests/integration` and `scripts/run-example.ts`.
 */
import type { ProgramNode } from "@aegisscript/ast";
import type { InterpretResult, MockSecurityEvent } from "@aegisscript/interpreter";

export interface TestRunRequest {
  readonly program: ProgramNode;
  readonly events: readonly MockSecurityEvent[];
}

export interface TestRunResult {
  readonly passed: boolean;
  readonly interpretResult: InterpretResult;
  readonly failures: readonly string[];
}

/**
 * Not implemented yet. Callers should use the interpreter directly for the
 * initial vertical slice.
 */
export function runAegisTests(_request: TestRunRequest): TestRunResult {
  throw new Error(
    "@aegisscript/test-runner is scaffolded only. Use @aegisscript/interpreter for the initial slice.",
  );
}
