import type { PlaygroundState } from "../types/playground";
import type { ScenarioId } from "./scenarios";

/** Clear everything derived from the current Bitpall source or events. */
export function clearDerivedOutput(state: PlaygroundState): PlaygroundState {
  return {
    ...state,
    diagnostics: [],
    program: null,
    interpretResult: null,
    testResult: null,
    parsedEvents: [],
    eventError: null,
  };
}

/** Invalidate state after manual Bitpall source edits. */
export function invalidateAfterSourceEdit(prev: PlaygroundState, source: string): PlaygroundState {
  return clearDerivedOutput({ ...prev, source });
}

/** Invalidate state after manual event JSON edits; keep compiled source if present. */
export function invalidateAfterEventEdit(
  prev: PlaygroundState,
  eventsJson: string,
): PlaygroundState {
  return {
    ...prev,
    eventsJson,
    interpretResult: null,
    testResult: null,
    parsedEvents: [],
    eventError: null,
  };
}

export function canExportMarkdown(state: PlaygroundState): boolean {
  return state.program !== null && state.interpretResult !== null;
}

export function createScenarioState(
  scenarioId: ScenarioId,
  source: string,
  eventsJson: string,
): PlaygroundState {
  return {
    scenarioId,
    source,
    eventsJson,
    diagnostics: [],
    program: null,
    interpretResult: null,
    testResult: null,
    parsedEvents: [],
    eventError: null,
  };
}
