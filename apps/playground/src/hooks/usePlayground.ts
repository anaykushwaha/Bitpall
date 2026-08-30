import { useState } from "react";
import { DEFAULT_EVENTS_JSON, DEFAULT_POLICY } from "../lib/defaults";
import {
  createScenarioState,
  invalidateAfterEventEdit,
  invalidateAfterSourceEdit,
} from "../lib/playgroundState";
import { compileSource, executeTests, parseEventsJson, simulateProgram } from "../lib/pipeline";
import { DEFAULT_SCENARIO_ID, getScenario, type ScenarioId } from "../lib/scenarios";
import type { PlaygroundState } from "../types/playground";

export function usePlayground() {
  const [state, setState] = useState<PlaygroundState>({
    scenarioId: DEFAULT_SCENARIO_ID,
    source: DEFAULT_POLICY,
    eventsJson: DEFAULT_EVENTS_JSON,
    diagnostics: [],
    program: null,
    interpretResult: null,
    testResult: null,
    parsedEvents: [],
    eventError: null,
  });

  const setSource = (source: string) => {
    setState((prev) => invalidateAfterSourceEdit(prev, source));
  };

  const setEventsJson = (eventsJson: string) => {
    setState((prev) => invalidateAfterEventEdit(prev, eventsJson));
  };

  const loadScenario = (scenarioId: ScenarioId) => {
    const scenario = getScenario(scenarioId);
    setState(createScenarioState(scenarioId, scenario.policy, scenario.eventsJson));
  };

  const check = () => {
    const compiled = compileSource("playground.bitpall", state.source);
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
    const compiled = compileSource("playground.bitpall", state.source);
    if (!compiled.ok || !compiled.program) {
      setState((prev) => ({
        ...prev,
        diagnostics: compiled.diagnostics,
        program: compiled.program,
        interpretResult: null,
        testResult: null,
        parsedEvents: [],
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
        parsedEvents: [],
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
      parsedEvents: events,
      eventError: null,
    }));
  };

  const runTests = () => {
    const compiled = compileSource("playground.bitpall", state.source);
    if (!compiled.ok || !compiled.program) {
      setState((prev) => ({
        ...prev,
        diagnostics: compiled.diagnostics,
        program: compiled.program,
        interpretResult: null,
        testResult: null,
        parsedEvents: [],
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
        parsedEvents: [],
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
      parsedEvents: events,
      eventError: null,
    }));
  };

  return {
    state,
    setSource,
    setEventsJson,
    loadScenario,
    check,
    runSimulation,
    runTests,
  };
}
