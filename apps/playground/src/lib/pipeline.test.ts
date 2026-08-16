import { describe, expect, it } from "vitest";
import { compileSource, executeTests, parseEventsJson, simulateProgram } from "./pipeline.js";

const POLICY_WITH_TESTS = `workspace w {
  telemetry edr { source = "endpoint-agent"; }
  telemetry filesystem { source = "file-monitor"; }
  rule chain {
    observe process_start where process.name == "powershell.exe";
    then file_write where file.extension == ".encrypted" within 2m;
  }
  test t { expect rule chain to_match; }
}
`;

const POLICY_WITHOUT_TESTS = `workspace w {
  telemetry edr { source = "endpoint-agent"; }
  telemetry filesystem { source = "file-monitor"; }
  rule chain {
    observe process_start where process.name == "powershell.exe";
    then file_write where file.extension == ".encrypted" within 2m;
  }
}
`;

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

describe("playground pipeline helpers", () => {
  it("compiles source without executing simulation or tests", () => {
    const compiled = compileSource("playground.bitpall", POLICY_WITH_TESTS);
    expect(compiled.ok).toBe(true);
    expect(compiled.program).not.toBeNull();
  });

  it("simulates rules without requiring test declarations", () => {
    const compiled = compileSource("playground.bitpall", POLICY_WITHOUT_TESTS);
    expect(compiled.ok).toBe(true);
    const events = parseEventsJson(EVENTS);
    expect(events.error).toBeNull();
    const result = simulateProgram(compiled.program!, events.events);
    expect(result.ruleResults[0]?.matched).toBe(true);
  });

  it("keeps simulation separate from test execution", () => {
    const compiled = compileSource("playground.bitpall", POLICY_WITH_TESTS);
    const events = parseEventsJson(EVENTS).events;
    const simulated = simulateProgram(compiled.program!, events);
    const tested = executeTests(compiled.program!, events);
    expect(simulated.ruleResults[0]?.matched).toBe(true);
    expect(tested.tests).toHaveLength(1);
    expect(tested.passed).toBe(true);
    // Simulation path does not invent test results; callers must not alias the two.
    expect(Object.hasOwn(simulated, "tests")).toBe(false);
  });

  it("surfaces event validation errors without throwing", () => {
    const result = parseEventsJson("{not-json");
    expect(result.error).toBeTruthy();
    expect(result.events).toEqual([]);
  });
});
