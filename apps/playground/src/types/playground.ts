import type { Diagnostic } from "@aegisscript/ast";
import type { InterpretResult } from "@aegisscript/interpreter";
import type { ProgramNode } from "@aegisscript/ast";

export interface PlaygroundState {
  source: string;
  eventsJson: string;
  diagnostics: Diagnostic[];
  program: ProgramNode | null;
  interpretResult: InterpretResult | null;
  eventError: string | null;
}
