import type { Diagnostic, ProgramNode } from "@aegisscript/ast";
import type { InterpretResult, MockSecurityEvent } from "@aegisscript/interpreter";
import type { TestRunResult } from "@aegisscript/test-runner";
import type { ScenarioId } from "../lib/scenarios";

export interface PlaygroundState {
  scenarioId: ScenarioId;
  source: string;
  eventsJson: string;
  diagnostics: Diagnostic[];
  program: ProgramNode | null;
  interpretResult: InterpretResult | null;
  testResult: TestRunResult | null;
  parsedEvents: readonly MockSecurityEvent[];
  eventError: string | null;
}
