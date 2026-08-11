import { createSourceFile } from "@aegisscript/ast";
import { check } from "@aegisscript/checker";
import { parse } from "@aegisscript/parser";
import { describe, expect, it } from "vitest";
import { chainConfidence, interpret, type MockSecurityEvent } from "../src/index.js";

const TWO_STAGE = `
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

const THREE_STAGE = `
workspace w {
  telemetry edr { source = "endpoint-agent"; }
  telemetry filesystem { source = "file-monitor"; }
  telemetry net { source = "network-sensor"; }
  rule chain {
    observe stage_a where process.name == "a";
    then stage_b where process.name == "b" within 5m;
    then stage_c where process.name == "c" within 5m;
  }
}
`;

function run(policy: string, events: MockSecurityEvent[]) {
  const source = createSourceFile("policy.aegis", policy);
  const parsed = parse(source);
  expect(parsed.program).not.toBeNull();
  const checked = check(parsed.program!, source);
  expect(checked.diagnostics.filter((d) => d.severity === "error")).toEqual([]);
  return interpret(checked.program, events);
}

const t0 = "2026-08-06T12:00:00.000Z";
const t45 = "2026-08-06T12:00:45.000Z";
const t90 = "2026-08-06T12:01:30.000Z";
const tLate = "2026-08-06T12:10:00.000Z";

describe("interpreter temporal ordering", () => {
  it("matches observe → then1 → then2 in order", () => {
    const result = run(THREE_STAGE, [
      {
        id: "a",
        type: "stage_a",
        timestamp: t0,
        source: "endpoint-agent",
        confidence: 1,
        properties: { process: { name: "a" } },
      },
      {
        id: "b",
        type: "stage_b",
        timestamp: t45,
        source: "file-monitor",
        confidence: 1,
        properties: { process: { name: "b" } },
      },
      {
        id: "c",
        type: "stage_c",
        timestamp: t90,
        source: "network-sensor",
        confidence: 1,
        properties: { process: { name: "c" } },
      },
    ]);
    expect(result.ruleResults[0]?.matched).toBe(true);
    expect(result.ruleResults[0]?.matchedEventIds).toEqual(["a", "b", "c"]);
  });

  it("rejects then2 before then1", () => {
    const result = run(THREE_STAGE, [
      {
        id: "a",
        type: "stage_a",
        timestamp: t0,
        source: "endpoint-agent",
        confidence: 1,
        properties: { process: { name: "a" } },
      },
      {
        id: "c",
        type: "stage_c",
        timestamp: t45,
        source: "network-sensor",
        confidence: 1,
        properties: { process: { name: "c" } },
      },
      {
        id: "b",
        type: "stage_b",
        timestamp: t90,
        source: "file-monitor",
        confidence: 1,
        properties: { process: { name: "b" } },
      },
    ]);
    expect(result.ruleResults[0]?.matched).toBe(false);
    expect(result.ruleResults[0]?.reason).toMatch(
      /before the previous matched stage|did not match/i,
    );
  });

  it("rejects then event before observe", () => {
    const result = run(TWO_STAGE, [
      {
        id: "early",
        type: "file_write",
        timestamp: "2026-08-06T11:59:00.000Z",
        source: "file-monitor",
        confidence: 0.9,
        properties: { file: { extension: ".encrypted" } },
      },
      {
        id: "obs",
        type: "process_start",
        timestamp: t0,
        source: "endpoint-agent",
        confidence: 0.9,
        properties: { process: { name: "powershell.exe" } },
      },
    ]);
    expect(result.ruleResults[0]?.matched).toBe(false);
  });

  it("rejects event outside overall window", () => {
    const result = run(TWO_STAGE, [
      {
        id: "obs",
        type: "process_start",
        timestamp: t0,
        source: "endpoint-agent",
        confidence: 0.9,
        properties: { process: { name: "powershell.exe" } },
      },
      {
        id: "late",
        type: "file_write",
        timestamp: tLate,
        source: "file-monitor",
        confidence: 0.9,
        properties: { file: { extension: ".encrypted" } },
      },
    ]);
    expect(result.ruleResults[0]?.matched).toBe(false);
    expect(result.ruleResults[0]?.reason).toMatch(/outside/i);
  });

  it("chooses the candidate that preserves chronological sequence", () => {
    const result = run(THREE_STAGE, [
      {
        id: "a",
        type: "stage_a",
        timestamp: t0,
        source: "endpoint-agent",
        confidence: 1,
        properties: { process: { name: "a" } },
      },
      {
        id: "b-late",
        type: "stage_b",
        timestamp: t90,
        source: "file-monitor",
        confidence: 1,
        properties: { process: { name: "b" } },
      },
      {
        id: "b-early",
        type: "stage_b",
        timestamp: t45,
        source: "file-monitor",
        confidence: 1,
        properties: { process: { name: "b" } },
      },
      {
        id: "c",
        type: "stage_c",
        timestamp: t90,
        source: "network-sensor",
        confidence: 1,
        properties: { process: { name: "c" } },
      },
    ]);
    expect(result.ruleResults[0]?.matched).toBe(true);
    expect(result.ruleResults[0]?.matchedEventIds).toEqual(["a", "b-early", "c"]);
  });

  it("handles identical timestamps with stable input-order tie-break", () => {
    const same = "2026-08-06T12:00:30.000Z";
    const result = run(THREE_STAGE, [
      {
        id: "a",
        type: "stage_a",
        timestamp: t0,
        source: "endpoint-agent",
        confidence: 1,
        properties: { process: { name: "a" } },
      },
      {
        id: "b",
        type: "stage_b",
        timestamp: same,
        source: "file-monitor",
        confidence: 1,
        properties: { process: { name: "b" } },
      },
      {
        id: "c",
        type: "stage_c",
        timestamp: same,
        source: "network-sensor",
        confidence: 1,
        properties: { process: { name: "c" } },
      },
    ]);
    expect(result.ruleResults[0]?.matched).toBe(true);
    expect(result.ruleResults[0]?.matchedEventIds).toEqual(["a", "b", "c"]);
  });

  it("matches when events are supplied out of order", () => {
    const result = run(THREE_STAGE, [
      {
        id: "c",
        type: "stage_c",
        timestamp: t90,
        source: "network-sensor",
        confidence: 1,
        properties: { process: { name: "c" } },
      },
      {
        id: "a",
        type: "stage_a",
        timestamp: t0,
        source: "endpoint-agent",
        confidence: 1,
        properties: { process: { name: "a" } },
      },
      {
        id: "b",
        type: "stage_b",
        timestamp: t45,
        source: "file-monitor",
        confidence: 1,
        properties: { process: { name: "b" } },
      },
    ]);
    expect(result.ruleResults[0]?.matched).toBe(true);
    expect(result.ruleResults[0]?.matchedEventIds).toEqual(["a", "b", "c"]);
  });
});

describe("interpreter confidence and telemetry", () => {
  const base: MockSecurityEvent[] = [
    {
      id: "evt-1",
      type: "process_start",
      timestamp: t0,
      source: "endpoint-agent",
      confidence: 0.9,
      properties: { process: { name: "powershell.exe" } },
    },
    {
      id: "evt-2",
      type: "file_write",
      timestamp: t45,
      source: "file-monitor",
      confidence: 0.85,
      properties: { file: { extension: ".encrypted" } },
    },
  ];

  it("matches a one-stage / two-stage successful chain", () => {
    const result = run(TWO_STAGE, base);
    expect(result.ruleResults[0]?.matched).toBe(true);
    expect(result.ruleResults[0]?.confidence).toBe(0.85);
  });

  it("uses minimum confidence across the chain", () => {
    expect(chainConfidence([{ ...base[0]! }, { ...base[1]!, confidence: 0.4 }])).toBe(0.4);
    expect(
      chainConfidence([
        { ...base[0]!, confidence: 0.95 },
        { ...base[1]!, confidence: 0.9 },
      ]),
    ).toBe(0.9);
  });

  it("treats missing confidence as zero", () => {
    const events = [
      { ...base[0]! },
      {
        id: "evt-2",
        type: "file_write",
        timestamp: t45,
        source: "file-monitor",
        properties: { file: { extension: ".encrypted" } },
      },
    ];
    const result = run(TWO_STAGE, events);
    expect(result.ruleResults[0]?.matched).toBe(false);
    expect(result.ruleResults[0]?.reason).toMatch(/confidence/i);
    expect(chainConfidence(events)).toBe(0);
  });

  it("fails with insufficient confidence", () => {
    const result = run(
      TWO_STAGE,
      base.map((e) => ({ ...e, confidence: 0.5 })),
    );
    expect(result.ruleResults[0]?.matched).toBe(false);
    expect(result.ruleResults[0]?.reason).toMatch(/confidence/i);
  });

  it("fails with insufficient sources when both events share one declared source", () => {
    const result = run(
      TWO_STAGE,
      base.map((e) => ({ ...e, source: "endpoint-agent" })),
    );
    expect(result.ruleResults[0]?.matched).toBe(false);
    expect(result.ruleResults[0]?.reason).toMatch(/sources/i);
  });

  it("excludes undeclared telemetry sources from stage matching", () => {
    const result = run(TWO_STAGE, [base[0]!, { ...base[1]!, source: "unknown-sensor" }]);
    expect(result.ruleResults[0]?.matched).toBe(false);
    expect(result.trace.some((t) => /not a declared telemetry source/i.test(t.message))).toBe(true);
  });

  it("fails when a condition does not match", () => {
    const result = run(TWO_STAGE, [
      base[0]!,
      { ...base[1]!, properties: { file: { extension: ".txt" } } },
    ]);
    expect(result.ruleResults[0]?.matched).toBe(false);
  });

  it("keeps approval-gated termination pending and records audit/rollback", () => {
    const policy = `
workspace corporate_network {
  asset endpoint finance_laptop { criticality = "high"; }
  telemetry edr { source = "endpoint-agent"; }
  telemetry filesystem { source = "file-monitor"; }
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
    const result = run(policy, base);
    expect(result.pendingApprovals.some((a) => a.action.type === "terminate_process")).toBe(true);
    expect(result.auditLog.some((e) => e.result.action.type === "isolate_endpoint")).toBe(true);
    expect(result.rollbackActions.some((a) => a.action.type === "reconnect_endpoint")).toBe(true);
  });
});

describe("interpreter observe candidate backtracking", () => {
  const policy = `
workspace w {
  telemetry edr { source = "endpoint-agent"; }
  telemetry filesystem { source = "file-monitor"; }
  rule chain {
    observe process_start where process.name == "powershell.exe";
    then file_write where file.extension == ".encrypted" within 2m;
  }
}
`;

  it("matches when the first observe candidate fails but a later candidate succeeds", () => {
    const result = run(policy, [
      {
        id: "early-ps",
        type: "process_start",
        timestamp: "2026-08-06T12:00:00.000Z",
        source: "endpoint-agent",
        confidence: 1,
        properties: { process: { name: "powershell.exe" } },
      },
      {
        id: "late-ps",
        type: "process_start",
        timestamp: "2026-08-06T12:10:00.000Z",
        source: "endpoint-agent",
        confidence: 1,
        properties: { process: { name: "powershell.exe" } },
      },
      {
        id: "encrypt",
        type: "file_write",
        timestamp: "2026-08-06T12:11:00.000Z",
        source: "file-monitor",
        confidence: 1,
        properties: { file: { extension: ".encrypted" } },
      },
    ]);
    expect(result.ruleResults[0]?.matched).toBe(true);
    expect(result.ruleResults[0]?.matchedEventIds).toEqual(["late-ps", "encrypt"]);
    expect(result.trace.some((t) => /Trying observe candidate 'early-ps'/i.test(t.message))).toBe(
      true,
    );
    expect(result.trace.some((t) => /Trying observe candidate 'late-ps'/i.test(t.message))).toBe(
      true,
    );
  });

  it("reports no match when every observe candidate fails", () => {
    const result = run(policy, [
      {
        id: "ps-1",
        type: "process_start",
        timestamp: "2026-08-06T12:00:00.000Z",
        source: "endpoint-agent",
        confidence: 1,
        properties: { process: { name: "powershell.exe" } },
      },
      {
        id: "ps-2",
        type: "process_start",
        timestamp: "2026-08-06T12:05:00.000Z",
        source: "endpoint-agent",
        confidence: 1,
        properties: { process: { name: "powershell.exe" } },
      },
      {
        id: "encrypt-late",
        type: "file_write",
        timestamp: "2026-08-06T12:20:00.000Z",
        source: "file-monitor",
        confidence: 1,
        properties: { file: { extension: ".encrypted" } },
      },
    ]);
    expect(result.ruleResults[0]?.matched).toBe(false);
    expect(result.ruleResults[0]?.reason).toMatch(/outside/i);
  });

  it("does not let a then-event before the selected observe candidate satisfy the rule", () => {
    const result = run(policy, [
      {
        id: "encrypt-early",
        type: "file_write",
        timestamp: "2026-08-06T11:59:00.000Z",
        source: "file-monitor",
        confidence: 1,
        properties: { file: { extension: ".encrypted" } },
      },
      {
        id: "ps",
        type: "process_start",
        timestamp: "2026-08-06T12:00:00.000Z",
        source: "endpoint-agent",
        confidence: 1,
        properties: { process: { name: "powershell.exe" } },
      },
    ]);
    expect(result.ruleResults[0]?.matched).toBe(false);
  });
});

describe("interpreter then-stage chain backtracking", () => {
  const helper = `
workspace w {
  telemetry edr { source = "endpoint-agent"; }
  telemetry filesystem { source = "file-monitor"; }
  telemetry net { source = "network-sensor"; }
`;

  it("backtracks when the first then candidate fails confidence but a later one passes", () => {
    const policy = `${helper}
  rule chain {
    observe process_start where process.name == "powershell.exe";
    then file_write where file.extension == ".encrypted" within 2m;
    require confidence >= 0.80;
  }
}
`;
    const result = run(policy, [
      {
        id: "obs",
        type: "process_start",
        timestamp: "2026-08-06T12:00:00.000Z",
        source: "endpoint-agent",
        confidence: 0.95,
        properties: { process: { name: "powershell.exe" } },
      },
      {
        id: "low",
        type: "file_write",
        timestamp: "2026-08-06T12:00:30.000Z",
        source: "file-monitor",
        confidence: 0.4,
        properties: { file: { extension: ".encrypted" } },
      },
      {
        id: "high",
        type: "file_write",
        timestamp: "2026-08-06T12:01:00.000Z",
        source: "file-monitor",
        confidence: 0.95,
        properties: { file: { extension: ".encrypted" } },
      },
    ]);
    expect(result.ruleResults[0]?.matched).toBe(true);
    expect(result.ruleResults[0]?.matchedEventIds).toEqual(["obs", "high"]);
    expect(result.ruleResults[0]?.confidence).toBe(0.95);
  });

  it("backtracks when the first then candidate fails sources but a later chain passes", () => {
    const policy = `${helper}
  rule chain {
    observe process_start where process.name == "powershell.exe";
    then file_write where file.extension == ".encrypted" within 2m;
    require sources >= 2;
  }
}
`;
    const result = run(policy, [
      {
        id: "obs",
        type: "process_start",
        timestamp: "2026-08-06T12:00:00.000Z",
        source: "endpoint-agent",
        confidence: 1,
        properties: { process: { name: "powershell.exe" } },
      },
      {
        id: "same-source",
        type: "file_write",
        timestamp: "2026-08-06T12:00:20.000Z",
        source: "endpoint-agent",
        confidence: 1,
        properties: { file: { extension: ".encrypted" } },
      },
      {
        id: "other-source",
        type: "file_write",
        timestamp: "2026-08-06T12:00:40.000Z",
        source: "file-monitor",
        confidence: 1,
        properties: { file: { extension: ".encrypted" } },
      },
    ]);
    expect(result.ruleResults[0]?.matched).toBe(true);
    expect(result.ruleResults[0]?.matchedEventIds).toEqual(["obs", "other-source"]);
    expect(result.ruleResults[0]?.sources).toBe(2);
  });

  it("backtracks at an intermediate then stage when the earliest path fails requirements", () => {
    // Earliest stage_b candidate A1 yields low confidence; later A2→B satisfies require.
    const policy = `${helper}
  rule chain {
    observe stage_a where process.name == "a";
    then stage_b where process.name == "b" within 5m;
    then stage_c where process.name == "c" within 5m;
    require confidence >= 0.80;
  }
}
`;
    const result = run(policy, [
      {
        id: "O",
        type: "stage_a",
        timestamp: "2026-08-06T12:00:00.000Z",
        source: "endpoint-agent",
        confidence: 1,
        properties: { process: { name: "a" } },
      },
      {
        id: "A1",
        type: "stage_b",
        timestamp: "2026-08-06T12:00:30.000Z",
        source: "file-monitor",
        confidence: 0.3,
        properties: { process: { name: "b" } },
      },
      {
        id: "A2",
        type: "stage_b",
        timestamp: "2026-08-06T12:00:40.000Z",
        source: "file-monitor",
        confidence: 1,
        properties: { process: { name: "b" } },
      },
      {
        id: "B",
        type: "stage_c",
        timestamp: "2026-08-06T12:00:50.000Z",
        source: "network-sensor",
        confidence: 1,
        properties: { process: { name: "c" } },
      },
    ]);
    expect(result.ruleResults[0]?.matched).toBe(true);
    expect(result.ruleResults[0]?.matchedEventIds).toEqual(["O", "A2", "B"]);
  });

  it("reports no match when every possible chain fails", () => {
    const policy = `${helper}
  rule chain {
    observe process_start where process.name == "powershell.exe";
    then file_write where file.extension == ".encrypted" within 2m;
    require confidence >= 0.80;
  }
}
`;
    const result = run(policy, [
      {
        id: "obs",
        type: "process_start",
        timestamp: "2026-08-06T12:00:00.000Z",
        source: "endpoint-agent",
        confidence: 0.95,
        properties: { process: { name: "powershell.exe" } },
      },
      {
        id: "low1",
        type: "file_write",
        timestamp: "2026-08-06T12:00:30.000Z",
        source: "file-monitor",
        confidence: 0.4,
        properties: { file: { extension: ".encrypted" } },
      },
      {
        id: "low2",
        type: "file_write",
        timestamp: "2026-08-06T12:01:00.000Z",
        source: "file-monitor",
        confidence: 0.5,
        properties: { file: { extension: ".encrypted" } },
      },
    ]);
    expect(result.ruleResults[0]?.matched).toBe(false);
    expect(result.ruleResults[0]?.reason).toMatch(/confidence/i);
  });

  it("does not weaken ordering while searching then candidates", () => {
    const policy = `${helper}
  rule chain {
    observe process_start where process.name == "powershell.exe";
    then file_write where file.extension == ".encrypted" within 2m;
  }
}
`;
    const result = run(policy, [
      {
        id: "encrypt-before",
        type: "file_write",
        timestamp: "2026-08-06T11:59:30.000Z",
        source: "file-monitor",
        confidence: 1,
        properties: { file: { extension: ".encrypted" } },
      },
      {
        id: "obs",
        type: "process_start",
        timestamp: "2026-08-06T12:00:00.000Z",
        source: "endpoint-agent",
        confidence: 1,
        properties: { process: { name: "powershell.exe" } },
      },
    ]);
    expect(result.ruleResults[0]?.matched).toBe(false);
  });

  it("does not accept then candidates outside the within window while backtracking", () => {
    const policy = `${helper}
  rule chain {
    observe process_start where process.name == "powershell.exe";
    then file_write where file.extension == ".encrypted" within 2m;
    require confidence >= 0.80;
  }
}
`;
    const result = run(policy, [
      {
        id: "obs",
        type: "process_start",
        timestamp: "2026-08-06T12:00:00.000Z",
        source: "endpoint-agent",
        confidence: 0.95,
        properties: { process: { name: "powershell.exe" } },
      },
      {
        id: "low-in-window",
        type: "file_write",
        timestamp: "2026-08-06T12:00:30.000Z",
        source: "file-monitor",
        confidence: 0.4,
        properties: { file: { extension: ".encrypted" } },
      },
      {
        id: "high-outside-window",
        type: "file_write",
        timestamp: "2026-08-06T12:05:00.000Z",
        source: "file-monitor",
        confidence: 0.95,
        properties: { file: { extension: ".encrypted" } },
      },
    ]);
    expect(result.ruleResults[0]?.matched).toBe(false);
    expect(result.ruleResults[0]?.reason).toMatch(/confidence|outside/i);
  });

  it("selects the earliest complete successful chain deterministically", () => {
    // Two fully valid chains: obs→early and obs→late. Prefer earliest then-candidate.
    const policy = `${helper}
  rule chain {
    observe process_start where process.name == "powershell.exe";
    then file_write where file.extension == ".encrypted" within 2m;
  }
}
`;
    const events = [
      {
        id: "obs",
        type: "process_start",
        timestamp: "2026-08-06T12:00:00.000Z",
        source: "endpoint-agent",
        confidence: 1,
        properties: { process: { name: "powershell.exe" } },
      },
      {
        id: "early",
        type: "file_write",
        timestamp: "2026-08-06T12:00:20.000Z",
        source: "file-monitor",
        confidence: 1,
        properties: { file: { extension: ".encrypted" } },
      },
      {
        id: "late",
        type: "file_write",
        timestamp: "2026-08-06T12:00:40.000Z",
        source: "file-monitor",
        confidence: 1,
        properties: { file: { extension: ".encrypted" } },
      },
    ];
    const first = run(policy, events);
    const second = run(policy, events);
    expect(first.ruleResults[0]?.matchedEventIds).toEqual(["obs", "early"]);
    expect(second.ruleResults[0]?.matchedEventIds).toEqual(["obs", "early"]);
  });

  it("does not execute responses for failed candidate chains", () => {
    const policy = `
workspace corporate_network {
  asset endpoint finance_laptop { criticality = "high"; }
  telemetry edr { source = "endpoint-agent"; }
  telemetry filesystem { source = "file-monitor"; }
  rule chain {
    observe process_start where process.name == "powershell.exe";
    then file_write where file.extension == ".encrypted" within 2m;
    require confidence >= 0.80;
    respond {
      isolate endpoint finance_laptop;
      preserve evidence;
    }
  }
}
`;
    const result = run(policy, [
      {
        id: "obs",
        type: "process_start",
        timestamp: "2026-08-06T12:00:00.000Z",
        source: "endpoint-agent",
        confidence: 0.95,
        properties: { process: { name: "powershell.exe" } },
      },
      {
        id: "low",
        type: "file_write",
        timestamp: "2026-08-06T12:00:30.000Z",
        source: "file-monitor",
        confidence: 0.4,
        properties: { file: { extension: ".encrypted" } },
      },
      {
        id: "high",
        type: "file_write",
        timestamp: "2026-08-06T12:01:00.000Z",
        source: "file-monitor",
        confidence: 0.95,
        properties: { file: { extension: ".encrypted" } },
      },
    ]);
    expect(result.ruleResults[0]?.matched).toBe(true);
    expect(result.ruleResults[0]?.matchedEventIds).toEqual(["obs", "high"]);
    expect(result.auditLog.filter((e) => e.result.action.type === "isolate_endpoint")).toHaveLength(
      1,
    );
    expect(
      result.auditLog.filter((e) => e.result.action.type === "preserve_evidence"),
    ).toHaveLength(1);
  });
});
