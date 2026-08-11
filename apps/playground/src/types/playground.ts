import type { Diagnostic, ProgramNode } from "@aegisscript/ast";
import type { InterpretResult } from "@aegisscript/interpreter";
import type { TestRunResult } from "@aegisscript/test-runner";

export interface PlaygroundState {
  source: string;
  eventsJson: string;
  diagnostics: Diagnostic[];
  program: ProgramNode | null;
  interpretResult: InterpretResult | null;
  testResult: TestRunResult | null;
  eventError: string | null;
}
