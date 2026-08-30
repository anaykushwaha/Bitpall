import { describe, expect, it } from "vitest";
import { compileSource, parseEventsJson, simulateProgram } from "./pipeline.js";
import {
  canExportMarkdown,
  createScenarioState,
  invalidateAfterEventEdit,
  invalidateAfterSourceEdit,
} from "./playgroundState.js";
import type { PlaygroundState } from "../types/playground.js";

const POLICY = `workspace w {
  telemetry edr { source = "endpoint-agent"; }
  telemetry filesystem { source = "file-monitor"; }
  rule chain {
    observe process_start where process.name == "powershell.exe";
    then file_write where file.extension == ".encrypted" within 2m;
  }
}`;

const EVENTS = `[
  {
    "id": "e1",
    "type": "process_start",
    "timestamp": "2026-08-06T12:00:00.000Z",
    "source": "endpoint-agent",
    "confidence": 0.9,
    "properties": { "process": { "name": "powershell.exe" } }
  },
  {
    "id": "e2",
    "type": "file_write",
    "timestamp": "2026-08-06T12:00:30.000Z",
    "source": "file-monitor",
    "confidence": 0.9,
    "properties": { "file": { "extension": ".encrypted" } }
  }
]`;

function runSimulation(state: PlaygroundState): PlaygroundState {
  const compiled = compileSource("playground.bitpall", state.source);
  if (!compiled.ok || !compiled.program) {
    throw new Error("expected valid policy");
  }
  const { events } = parseEventsJson(state.eventsJson);
  const interpretResult = simulateProgram(compiled.program, events);
  return {
    ...state,
    diagnostics: compiled.diagnostics,
    program: compiled.program,
    interpretResult,
    testResult: null,
    parsedEvents: events,
    eventError: null,
  };
}

function baseState(): PlaygroundState {
  return createScenarioState("ransomware", POLICY, EVENTS);
}

describe("playground state invalidation", () => {
  it("Test A — source edit invalidates simulation and export", () => {
    const afterRun = runSimulation(baseState());
    expect(afterRun.interpretResult?.ruleResults[0]?.matched).toBe(true);
    expect(canExportMarkdown(afterRun)).toBe(true);

    const afterEdit = invalidateAfterSourceEdit(afterRun, `${POLICY}\n// edited`);
    expect(afterEdit.interpretResult).toBeNull();
    expect(afterEdit.testResult).toBeNull();
    expect(afterEdit.program).toBeNull();
    expect(afterEdit.diagnostics).toEqual([]);
    expect(afterEdit.parsedEvents).toEqual([]);
    expect(canExportMarkdown(afterEdit)).toBe(false);
  });

  it("Test B — event edit invalidates simulation but keeps compiled source", () => {
    const compiled = compileSource("playground.bitpall", POLICY);
    const afterRun = runSimulation(baseState());
    expect(afterRun.interpretResult).not.toBeNull();
    expect(canExportMarkdown(afterRun)).toBe(true);

    const afterEdit = invalidateAfterEventEdit(afterRun, '[{"id":"changed"}]');
    expect(afterEdit.interpretResult).toBeNull();
    expect(afterEdit.testResult).toBeNull();
    expect(afterEdit.parsedEvents).toEqual([]);
    expect(afterEdit.eventError).toBeNull();
    expect(afterEdit.program).toEqual(compiled.program);
    expect(canExportMarkdown(afterEdit)).toBe(false);
  });

  it("Test C — rerun after edit produces a fresh result", () => {
    const edited = invalidateAfterSourceEdit(runSimulation(baseState()), `${POLICY}\n`);
    expect(canExportMarkdown(edited)).toBe(false);

    const rerun = runSimulation({ ...edited, source: POLICY, eventsJson: EVENTS });
    expect(rerun.interpretResult?.ruleResults[0]?.matched).toBe(true);
    expect(canExportMarkdown(rerun)).toBe(true);
  });

  it("Test D — scenario switch clears derived state", () => {
    const afterRun = runSimulation(baseState());
    expect(afterRun.interpretResult).not.toBeNull();

    const switched = createScenarioState(
      "account-takeover",
      'workspace identity_ops { telemetry idp { source = "identity-provider"; } rule r { observe login where true; } }',
      "[]",
    );
    expect(switched.scenarioId).toBe("account-takeover");
    expect(switched.interpretResult).toBeNull();
    expect(switched.testResult).toBeNull();
    expect(switched.program).toBeNull();
    expect(switched.diagnostics).toEqual([]);
    expect(canExportMarkdown(switched)).toBe(false);
  });

  it("preserves event JSON when only source changes", () => {
    const afterEdit = invalidateAfterSourceEdit(baseState(), "workspace x {}");
    expect(afterEdit.eventsJson).toBe(EVENTS);
  });

  it("preserves source when only events change", () => {
    const afterEdit = invalidateAfterEventEdit(baseState(), "[]");
    expect(afterEdit.source).toBe(POLICY);
  });

  it("export remains disabled until program and interpret result exist", () => {
    expect(canExportMarkdown(baseState())).toBe(false);
    const compiledOnly = {
      ...baseState(),
      program: compileSource("playground.bitpall", POLICY).program,
    };
    expect(canExportMarkdown(compiledOnly)).toBe(false);
  });
});
