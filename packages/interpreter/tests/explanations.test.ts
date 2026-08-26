import { createSourceFile } from "@bitpall/ast";
import { check } from "@bitpall/checker";
import { parse } from "@bitpall/parser";
import { describe, expect, it } from "vitest";
import { interpret, type MockSecurityEvent } from "../src/index.js";

const POLICY = `
workspace w {
  telemetry edr { source = "endpoint-agent"; }
  telemetry filesystem { source = "file-monitor"; }
  rule chain {
    observe process_start where process.name == "powershell.exe";
    then file_write where file.extension == ".encrypted" within 2m;
    require confidence >= 0.80;
    require sources >= 2;
  }
}
`;

function run(events: MockSecurityEvent[]) {
  const source = createSourceFile("policy.bitpall", POLICY);
  const parsed = parse(source);
  expect(parsed.program).not.toBeNull();
  const checked = check(parsed.program!, source);
  expect(checked.diagnostics.filter((d) => d.severity === "error")).toEqual([]);
  return interpret(checked.program, events);
}

describe("structured match explanations", () => {
  it("exposes actual/operator/expected for each predicate", () => {
    const result = run([
      {
        id: "e1",
        type: "process_start",
        timestamp: "2026-08-06T12:00:00.000Z",
        source: "endpoint-agent",
        confidence: 0.9,
        properties: { process: { name: "powershell.exe" } },
      },
      {
        id: "e2",
        type: "file_write",
        timestamp: "2026-08-06T12:00:30.000Z",
        source: "file-monitor",
        confidence: 0.85,
        properties: { file: { extension: ".encrypted" } },
      },
    ]);

    const rule = result.ruleResults[0]!;
    expect(rule.matched).toBe(true);
    expect(rule.stageExplanations).toHaveLength(2);

    const observe = rule.stageExplanations[0]!;
    expect(observe.stageKind).toBe("observe");
    expect(observe.eventId).toBe("e1");
    expect(observe.eventType).toBe("process_start");
    expect(observe.conditions).toEqual([
      {
        field: "process.name",
        operator: "==",
        actual: "powershell.exe",
        expected: "powershell.exe",
        passed: true,
      },
    ]);

    const thenStage = rule.stageExplanations[1]!;
    expect(thenStage.stageKind).toBe("then");
    expect(thenStage.eventId).toBe("e2");
    expect(thenStage.within).toBe("2m");
    expect(thenStage.conditions).toEqual([
      {
        field: "file.extension",
        operator: "==",
        actual: ".encrypted",
        expected: ".encrypted",
        passed: true,
      },
    ]);
  });

  it("exposes requirement evaluations with boundary equality for >=", () => {
    const result = run([
      {
        id: "e1",
        type: "process_start",
        timestamp: "2026-08-06T12:00:00.000Z",
        source: "endpoint-agent",
        confidence: 0.8,
        properties: { process: { name: "powershell.exe" } },
      },
      {
        id: "e2",
        type: "file_write",
        timestamp: "2026-08-06T12:00:30.000Z",
        source: "file-monitor",
        confidence: 0.8,
        properties: { file: { extension: ".encrypted" } },
      },
    ]);

    const rule = result.ruleResults[0]!;
    expect(rule.matched).toBe(true);
    expect(rule.requirementEvaluations).toEqual([
      {
        metric: "confidence",
        operator: ">=",
        expected: 0.8,
        actual: 0.8,
        passed: true,
      },
      {
        metric: "sources",
        operator: ">=",
        expected: 2,
        actual: 2,
        passed: true,
      },
    ]);
  });

  it("fails requirements below the confidence threshold and retains evaluations", () => {
    const result = run([
      {
        id: "e1",
        type: "process_start",
        timestamp: "2026-08-06T12:00:00.000Z",
        source: "endpoint-agent",
        confidence: 0.62,
        properties: { process: { name: "powershell.exe" } },
      },
      {
        id: "e2",
        type: "file_write",
        timestamp: "2026-08-06T12:00:30.000Z",
        source: "file-monitor",
        confidence: 0.9,
        properties: { file: { extension: ".encrypted" } },
      },
    ]);

    const rule = result.ruleResults[0]!;
    expect(rule.matched).toBe(false);
    expect(rule.requirementEvaluations).toEqual([
      {
        metric: "confidence",
        operator: ">=",
        expected: 0.8,
        actual: 0.62,
        passed: false,
      },
      {
        metric: "sources",
        operator: ">=",
        expected: 2,
        actual: 2,
        passed: true,
      },
    ]);
    expect(result.auditLog).toHaveLength(0);
  });

  it("keeps stage order from the rule even when events arrive shuffled", () => {
    const result = run([
      {
        id: "e2",
        type: "file_write",
        timestamp: "2026-08-06T12:00:30.000Z",
        source: "file-monitor",
        confidence: 0.9,
        properties: { file: { extension: ".encrypted" } },
      },
      {
        id: "e1",
        type: "process_start",
        timestamp: "2026-08-06T12:00:00.000Z",
        source: "endpoint-agent",
        confidence: 0.9,
        properties: { process: { name: "powershell.exe" } },
      },
    ]);

    expect(result.ruleResults[0]?.matchedEventIds).toEqual(["e1", "e2"]);
    expect(result.ruleResults[0]?.stageExplanations.map((s) => s.eventId)).toEqual(["e1", "e2"]);
  });
});
