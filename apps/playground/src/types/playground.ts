import type { Diagnostic, ProgramNode } from "@bitpall/ast";
import type { InterpretResult, MockSecurityEvent } from "@bitpall/interpreter";
import type { TestRunResult } from "@bitpall/test-runner";
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
