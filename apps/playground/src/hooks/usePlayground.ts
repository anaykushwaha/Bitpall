import { useState } from "react";
import { analyzeSource } from "@aegisscript/language-service";
import { validateMockEvents } from "@aegisscript/interpreter";
import { runAegisTests } from "@aegisscript/test-runner";
import { DEFAULT_EVENTS_JSON, DEFAULT_POLICY } from "../lib/defaults";
import type { PlaygroundState } from "../types/playground";

function parseEventsJson(eventsJson: string): {
  events: ReturnType<typeof validateMockEvents>["events"];
  error: string | null;
} {
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

export function usePlayground() {
  const [state, setState] = useState<PlaygroundState>({
    source: DEFAULT_POLICY,
    eventsJson: DEFAULT_EVENTS_JSON,
    diagnostics: [],
    program: null,
    interpretResult: null,
    testResult: null,
    eventError: null,
  });

  const setSource = (source: string) => {
    setState((prev) => ({ ...prev, source }));
  };

  const setEventsJson = (eventsJson: string) => {
    setState((prev) => ({ ...prev, eventsJson }));
  };

  const check = () => {
    const result = analyzeSource("playground.aegis", state.source);
    setState((prev) => ({
      ...prev,
      diagnostics: result.diagnostics,
      program: result.program,
      interpretResult: null,
      testResult: null,
      eventError: null,
    }));
    return result;
  };

  const runSimulation = () => {
    const analyzed = analyzeSource("playground.aegis", state.source);
    if (!analyzed.program || analyzed.diagnostics.some((d) => d.severity === "error")) {
      setState((prev) => ({
        ...prev,
        diagnostics: analyzed.diagnostics,
        program: analyzed.program,
        interpretResult: null,
        testResult: null,
        eventError: "Fix diagnostics before running the simulation.",
      }));
      return;
    }

    const { events, error } = parseEventsJson(state.eventsJson);
    if (error) {
      setState((prev) => ({
        ...prev,
        diagnostics: analyzed.diagnostics,
        program: analyzed.program,
        interpretResult: null,
        testResult: null,
        eventError: error,
      }));
      return;
    }

    const testResult = runAegisTests({ program: analyzed.program, events });
    setState((prev) => ({
      ...prev,
      diagnostics: analyzed.diagnostics,
      program: analyzed.program,
      interpretResult: testResult.interpretResult,
      testResult,
      eventError: null,
    }));
  };

  const runTests = () => {
    runSimulation();
  };

  return {
    state,
    setSource,
    setEventsJson,
    check,
    runSimulation,
    runTests,
  };
}
