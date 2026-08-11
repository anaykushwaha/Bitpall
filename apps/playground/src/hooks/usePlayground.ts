import { useState } from "react";
import { DEFAULT_EVENTS_JSON, DEFAULT_POLICY } from "../lib/defaults";
import { compileSource, executeTests, parseEventsJson, simulateProgram } from "../lib/pipeline";
import type { PlaygroundState } from "../types/playground";

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
    const compiled = compileSource("playground.aegis", state.source);
    setState((prev) => ({
      ...prev,
      diagnostics: compiled.diagnostics,
      program: compiled.program,
      interpretResult: null,
      testResult: null,
      eventError: null,
    }));
    return compiled;
  };

  const runSimulation = () => {
    const compiled = compileSource("playground.aegis", state.source);
    if (!compiled.ok || !compiled.program) {
      setState((prev) => ({
        ...prev,
        diagnostics: compiled.diagnostics,
        program: compiled.program,
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
        diagnostics: compiled.diagnostics,
        program: compiled.program,
        interpretResult: null,
        testResult: null,
        eventError: error,
      }));
      return;
    }

    const interpretResult = simulateProgram(compiled.program, events);
    setState((prev) => ({
      ...prev,
      diagnostics: compiled.diagnostics,
      program: compiled.program,
      interpretResult,
      testResult: null,
      eventError: null,
    }));
  };

  const runTests = () => {
    const compiled = compileSource("playground.aegis", state.source);
    if (!compiled.ok || !compiled.program) {
      setState((prev) => ({
        ...prev,
        diagnostics: compiled.diagnostics,
        program: compiled.program,
        interpretResult: null,
        testResult: null,
        eventError: "Fix diagnostics before running tests.",
      }));
      return;
    }

    const { events, error } = parseEventsJson(state.eventsJson);
    if (error) {
      setState((prev) => ({
        ...prev,
        diagnostics: compiled.diagnostics,
        program: compiled.program,
        interpretResult: null,
        testResult: null,
        eventError: error,
      }));
      return;
    }

    const testResult = executeTests(compiled.program, events);
    setState((prev) => ({
      ...prev,
      diagnostics: compiled.diagnostics,
      program: compiled.program,
      interpretResult: testResult.interpretResult,
      testResult,
      eventError: null,
    }));
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
