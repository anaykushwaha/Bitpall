import { createSourceFile } from "@aegisscript/ast";
import { check } from "@aegisscript/checker";
import { parse } from "@aegisscript/parser";
import { describe, expect, it } from "vitest";
import { interpret, type MockSecurityEvent } from "../src/index.js";

const POLICY = `
workspace corporate_network {
  asset endpoint finance_laptop { criticality = "high"; }
  telemetry edr { source = "endpoint-agent"; }
  rule suspicious_encryption_chain {
    observe process_start where process.name == "powershell.exe";
    then file_write where file.extension == ".encrypted" within 2m;
    require confidence >= 0.80;
    require sources >= 2;
    respond {
      isolate endpoint finance_laptop;
      preserve evidence;
      approval required for terminate_process;
    }
    rollback { reconnect endpoint finance_laptop; }
  }
}
`;

function run(events: MockSecurityEvent[]) {
  const source = createSourceFile("policy.aegis", POLICY);
  const parsed = parse(source);
  expect(parsed.program).not.toBeNull();
  const checked = check(parsed.program!, source);
  expect(checked.diagnostics.filter((d) => d.severity === "error")).toEqual([]);
  return interpret(checked.program, events);
}

const baseEvents: MockSecurityEvent[] = [
  {
    id: "evt-1",
    type: "process_start",
    timestamp: "2026-08-06T12:00:00.000Z",
    source: "endpoint-agent",
    confidence: 0.9,
    properties: { process: { name: "powershell.exe" } },
  },
  {
    id: "evt-2",
    type: "file_write",
    timestamp: "2026-08-06T12:00:45.000Z",
    source: "file-monitor",
    confidence: 0.85,
    properties: { file: { extension: ".encrypted" } },
  },
];

describe("interpreter", () => {
  it("matches a successful temporal sequence", () => {
    const result = run(baseEvents);
    const rule = result.ruleResults[0];
    expect(rule?.matched).toBe(true);
    expect(rule?.matchedEventIds).toEqual(["evt-1", "evt-2"]);
    expect(result.auditLog.length).toBeGreaterThan(0);
  });

  it("fails when the then event is outside the time window", () => {
    const events: MockSecurityEvent[] = [
      baseEvents[0]!,
      {
        ...baseEvents[1]!,
        id: "evt-late",
        timestamp: "2026-08-06T12:05:00.000Z",
      },
    ];
    const result = run(events);
    expect(result.ruleResults[0]?.matched).toBe(false);
    expect(result.ruleResults[0]?.reason).toMatch(/outside/i);
  });

  it("fails when a condition does not match", () => {
    const events: MockSecurityEvent[] = [
      baseEvents[0]!,
      {
        ...baseEvents[1]!,
        properties: { file: { extension: ".txt" } },
      },
    ];
    const result = run(events);
    expect(result.ruleResults[0]?.matched).toBe(false);
  });

  it("fails with insufficient sources", () => {
    const events = baseEvents.map((e) => ({ ...e, source: "only-one" }));
    const result = run(events);
    expect(result.ruleResults[0]?.matched).toBe(false);
    expect(result.ruleResults[0]?.reason).toMatch(/sources/i);
  });

  it("fails with insufficient confidence", () => {
    const events = baseEvents.map((e) => ({ ...e, confidence: 0.5 }));
    const result = run(events);
    expect(result.ruleResults[0]?.matched).toBe(false);
    expect(result.ruleResults[0]?.reason).toMatch(/confidence/i);
  });

  it("keeps approval-gated termination pending", () => {
    const result = run(baseEvents);
    expect(result.pendingApprovals.some((a) => a.action.type === "terminate_process")).toBe(true);
    expect(result.pendingApprovals[0]?.status).toBe("pending_approval");
  });

  it("generates an audit log for simulated responses", () => {
    const result = run(baseEvents);
    expect(result.auditLog.some((e) => e.result.action.type === "isolate_endpoint")).toBe(true);
    expect(result.auditLog.some((e) => e.result.action.type === "preserve_evidence")).toBe(true);
    expect(result.rollbackActions.some((a) => a.action.type === "reconnect_endpoint")).toBe(true);
  });
});
