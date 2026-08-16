import type { Diagnostic, ProgramNode } from "@bitpall/ast";
import {
  interpret,
  validateMockEvents,
  type InterpretResult,
  type MockSecurityEvent,
} from "@bitpall/interpreter";
import { analyzeSource } from "@bitpall/language-service";
import { runBitpallTests, type TestRunResult } from "@bitpall/test-runner";

export interface CompileResult {
  readonly diagnostics: Diagnostic[];
  readonly program: ProgramNode | null;
  readonly ok: boolean;
}

export interface EventParseResult {
  readonly events: MockSecurityEvent[];
  readonly error: string | null;
}

export function compileSource(fileName: string, source: string): CompileResult {
  const analyzed = analyzeSource(fileName, source);
  return {
    diagnostics: analyzed.diagnostics,
    program: analyzed.program,
    ok: analyzed.program !== null && !analyzed.diagnostics.some((d) => d.severity === "error"),
  };
}

export function parseEventsJson(eventsJson: string): EventParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(eventsJson);
  } catch (error) {
    return {
      events: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }

  const validated = validateMockEvents(parsed);
  if (!validated.ok) {
    return {
      events: [],
      error: validated.diagnostics.map((d) => `${d.path}: ${d.message}`).join("\n"),
    };
  }
  return { events: validated.events, error: null };
}

export function simulateProgram(
  program: ProgramNode,
  events: readonly MockSecurityEvent[],
): InterpretResult {
  return interpret(program, events);
}

export function executeTests(
  program: ProgramNode,
  events: readonly MockSecurityEvent[],
): TestRunResult {
  return runBitpallTests({ program, events });
}
