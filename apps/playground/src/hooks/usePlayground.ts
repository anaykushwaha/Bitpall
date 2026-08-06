import { useState } from "react";
import { analyzeSource } from "@aegisscript/language-service";
import { interpret, type MockSecurityEvent } from "@aegisscript/interpreter";
import { DEFAULT_EVENTS_JSON, DEFAULT_POLICY } from "../lib/defaults";
import type { PlaygroundState } from "../types/playground";

export function usePlayground() {
  const [state, setState] = useState<PlaygroundState>({
    source: DEFAULT_POLICY,
    eventsJson: DEFAULT_EVENTS_JSON,
    diagnostics: [],
    program: null,
    interpretResult: null,
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
        eventError: "Fix diagnostics before running the simulation.",
      }));
      return;
    }

    let events: MockSecurityEvent[];
    try {
      const parsed: unknown = JSON.parse(state.eventsJson);
      if (!Array.isArray(parsed)) {
        throw new Error("Events JSON must be an array");
      }
      events = parsed as MockSecurityEvent[];
    } catch (error) {
      setState((prev) => ({
        ...prev,
        diagnostics: analyzed.diagnostics,
        program: analyzed.program,
        interpretResult: null,
        eventError: error instanceof Error ? error.message : String(error),
      }));
      return;
    }

    try {
      const interpretResult = interpret(analyzed.program, events);
      setState((prev) => ({
        ...prev,
        diagnostics: analyzed.diagnostics,
        program: analyzed.program,
        interpretResult,
        eventError: null,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        diagnostics: analyzed.diagnostics,
        program: analyzed.program,
        interpretResult: null,
        eventError: error instanceof Error ? error.message : String(error),
      }));
    }
  };

  return {
    state,
    setSource,
    setEventsJson,
    check,
    runSimulation,
  };
}
