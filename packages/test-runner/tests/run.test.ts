import { createSourceFile } from "@bitpall/ast";
import { check } from "@bitpall/checker";
import { parse } from "@bitpall/parser";
import type { MockSecurityEvent } from "@bitpall/interpreter";
import { describe, expect, it } from "vitest";
import { runBitpallTests } from "../src/index.js";

function checked(text: string) {
  const source = createSourceFile("policy.bitpall", text);
  const parsed = parse(source);
  expect(parsed.program).not.toBeNull();
  const result = check(parsed.program!, source);
  expect(result.diagnostics.filter((d) => d.severity === "error")).toEqual([]);
  return result.program;
}

const matchingEvents: MockSecurityEvent[] = [
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
    confidence: 0.9,
    properties: { file: { extension: ".encrypted" } },
  },
];

const POLICY = `
workspace corporate_network {
  telemetry edr { source = "endpoint-agent"; }
  telemetry filesystem { source = "file-monitor"; }
  rule suspicious_encryption_chain {
    observe process_start where process.name == "powershell.exe";
    then file_write where file.extension == ".encrypted" within 2m;
  }
  test ransomware_sequence {
    expect rule suspicious_encryption_chain to_match;
  }
}
`;

describe("test-runner", () => {
  it("passes a matching expectation", () => {
    const result = runBitpallTests({ program: checked(POLICY), events: matchingEvents });
    expect(result.passed).toBe(true);
    expect(result.tests).toHaveLength(1);
    expect(result.tests[0]?.assertions[0]?.passed).toBe(true);
    expect(result.tests[0]?.assertions[0]).toMatchObject({
      kind: "rule_match",
      expected: "match",
    });
  });

  it("fails when the rule does not match", () => {
    const result = runBitpallTests({
      program: checked(POLICY),
      events: [matchingEvents[0]!],
    });
    expect(result.passed).toBe(false);
    expect(result.tests[0]?.assertions[0]?.actual).toBe(false);
    expect(result.tests[0]?.assertions[0]?.message).toMatch(/did not/);
  });

  it("passes to_not_match when the rule does not match", () => {
    const program = checked(`
workspace w {
  telemetry edr { source = "endpoint-agent"; }
  telemetry filesystem { source = "file-monitor"; }
  rule suspicious_encryption_chain {
    observe process_start where process.name == "powershell.exe";
    then file_write where file.extension == ".encrypted" within 2m;
  }
  test negative {
    expect rule suspicious_encryption_chain to_not_match;
  }
}
`);
    const result = runBitpallTests({ program, events: [matchingEvents[0]!] });
    expect(result.passed).toBe(true);
    expect(result.tests[0]?.assertions[0]).toMatchObject({
      kind: "rule_match",
      expected: "not_match",
      actual: false,
      passed: true,
    });
  });

  it("fails to_not_match when the rule matches", () => {
    const program = checked(`
workspace w {
  telemetry edr { source = "endpoint-agent"; }
  telemetry filesystem { source = "file-monitor"; }
  rule suspicious_encryption_chain {
    observe process_start where process.name == "powershell.exe";
    then file_write where file.extension == ".encrypted" within 2m;
  }
  test negative {
    expect rule suspicious_encryption_chain to_not_match;
  }
}
`);
    const result = runBitpallTests({ program, events: matchingEvents });
    expect(result.passed).toBe(false);
    expect(result.tests[0]?.assertions[0]?.message).toMatch(/not to match, but it matched/);
  });

  it("passes confidence assertions against interpreter confidence", () => {
    const program = checked(`
workspace w {
  telemetry edr { source = "endpoint-agent"; }
  telemetry filesystem { source = "file-monitor"; }
  rule suspicious_encryption_chain {
    observe process_start where process.name == "powershell.exe";
    then file_write where file.extension == ".encrypted" within 2m;
  }
  test confidence_gate {
    expect rule suspicious_encryption_chain confidence >= 0.9;
    expect rule suspicious_encryption_chain confidence > 0.8;
    expect rule suspicious_encryption_chain confidence == 0.9;
  }
}
`);
    const result = runBitpallTests({ program, events: matchingEvents });
    expect(result.passed).toBe(true);
    expect(result.tests[0]?.assertions).toHaveLength(3);
    expect(result.tests[0]?.assertions.every((a) => a.kind === "rule_confidence")).toBe(true);
  });

  it("fails confidence assertions with clear diagnostics", () => {
    const program = checked(`
workspace w {
  telemetry edr { source = "endpoint-agent"; }
  telemetry filesystem { source = "file-monitor"; }
  rule suspicious_encryption_chain {
    observe process_start where process.name == "powershell.exe";
    then file_write where file.extension == ".encrypted" within 2m;
  }
  test confidence_gate {
    expect rule suspicious_encryption_chain confidence >= 0.95;
  }
}
`);
    const result = runBitpallTests({ program, events: matchingEvents });
    expect(result.passed).toBe(false);
    const assertion = result.tests[0]?.assertions[0];
    expect(assertion?.kind).toBe("rule_confidence");
    if (assertion?.kind === "rule_confidence") {
      expect(assertion.actual).toBe(0.9);
      expect(assertion.message).toMatch(/confidence >= 0\.95/);
      expect(assertion.message).toMatch(/actual confidence was 0\.90/);
    }
  });

  it("supports confidence boundary equality and less-than comparisons", () => {
    const program = checked(`
workspace w {
  telemetry edr { source = "endpoint-agent"; }
  telemetry filesystem { source = "file-monitor"; }
  rule suspicious_encryption_chain {
    observe process_start where process.name == "powershell.exe";
    then file_write where file.extension == ".encrypted" within 2m;
  }
  test confidence_gate {
    expect rule suspicious_encryption_chain confidence == 0.9;
    expect rule suspicious_encryption_chain confidence <= 0.9;
    expect rule suspicious_encryption_chain confidence < 0.95;
    expect rule suspicious_encryption_chain confidence != 0.5;
  }
}
`);
    const result = runBitpallTests({ program, events: matchingEvents });
    expect(result.passed).toBe(true);
  });

  it("supports multiple assertion kinds in one test", () => {
    const program = checked(`
workspace w {
  telemetry edr { source = "endpoint-agent"; }
  telemetry filesystem { source = "file-monitor"; }
  rule suspicious_encryption_chain {
    observe process_start where process.name == "powershell.exe";
    then file_write where file.extension == ".encrypted" within 2m;
  }
  rule other {
    observe process_start where process.name == "other.exe";
  }
  test mixed {
    expect rule suspicious_encryption_chain to_match;
    expect rule other to_not_match;
    expect rule suspicious_encryption_chain confidence >= 0.9;
  }
}
`);
    const result = runBitpallTests({ program, events: matchingEvents });
    expect(result.passed).toBe(true);
    expect(result.tests[0]?.assertions).toHaveLength(3);
  });

  it("supports multiple expectations in one test", () => {
    const program = checked(`
workspace w {
  telemetry edr { source = "endpoint-agent"; }
  telemetry filesystem { source = "file-monitor"; }
  rule one {
    observe process_start where process.name == "powershell.exe";
  }
  rule two {
    observe file_write where file.extension == ".encrypted";
  }
  test both {
    expect rule one to_match;
    expect rule two to_match;
  }
}
`);
    const result = runBitpallTests({ program, events: matchingEvents });
    expect(result.passed).toBe(true);
    expect(result.tests[0]?.assertions).toHaveLength(2);
  });

  it("supports multiple test declarations", () => {
    const program = checked(`
workspace w {
  telemetry edr { source = "endpoint-agent"; }
  telemetry filesystem { source = "file-monitor"; }
  rule one {
    observe process_start where process.name == "powershell.exe";
  }
  test t1 { expect rule one to_match; }
  test t2 { expect rule one to_match; }
}
`);
    const result = runBitpallTests({ program, events: matchingEvents });
    expect(result.tests.map((t) => t.testName)).toEqual(["t1", "t2"]);
    expect(result.passed).toBe(true);
  });

  it("supports multiple workspaces", () => {
    const program = checked(`
workspace alpha {
  telemetry edr { source = "endpoint-agent"; }
  rule one { observe process_start where process.name == "powershell.exe"; }
  test t { expect rule one to_match; }
}
workspace beta {
  telemetry edr { source = "endpoint-agent"; }
  rule two { observe process_start where process.name == "powershell.exe"; }
  test t { expect rule two to_match; }
}
`);
    const result = runBitpallTests({ program, events: [matchingEvents[0]!] });
    expect(result.tests).toHaveLength(2);
    expect(result.tests.map((t) => t.workspaceName).sort()).toEqual(["alpha", "beta"]);
    expect(result.passed).toBe(true);
  });

  it("returns passed=true with empty tests when no test declarations exist", () => {
    const program = checked(`
workspace w {
  telemetry edr { source = "endpoint-agent"; }
  rule one { observe process_start where process.name == "powershell.exe"; }
}
`);
    const result = runBitpallTests({ program, events: matchingEvents });
    expect(result.tests).toEqual([]);
    expect(result.passed).toBe(true);
    expect(result.interpretResult.ruleResults[0]?.matched).toBe(true);
  });

  it("produces deterministic structured output", () => {
    const program = checked(POLICY);
    const first = runBitpallTests({ program, events: matchingEvents });
    const second = runBitpallTests({ program, events: matchingEvents });
    expect(first).toEqual(second);
  });

  it("resolves identical rule names independently across workspaces", () => {
    const program = checked(`
workspace production {
  telemetry edr { source = "endpoint-agent"; }
  rule suspicious_login {
    observe process_start where process.name == "powershell.exe";
  }
  test t { expect rule suspicious_login to_match; }
}
workspace corporate {
  telemetry edr { source = "endpoint-agent"; }
  rule suspicious_login {
    observe process_start where process.name == "other.exe";
  }
  test t { expect rule suspicious_login to_match; }
}
`);
    const result = runBitpallTests({ program, events: [matchingEvents[0]!] });
    const production = result.tests.find((t) => t.workspaceName === "production");
    const corporate = result.tests.find((t) => t.workspaceName === "corporate");
    expect(production?.passed).toBe(true);
    expect(corporate?.passed).toBe(false);
    expect(result.passed).toBe(false);
    expect(
      result.interpretResult.ruleResults.find(
        (r) => r.workspaceName === "production" && r.ruleName === "suspicious_login",
      )?.matched,
    ).toBe(true);
    expect(
      result.interpretResult.ruleResults.find(
        (r) => r.workspaceName === "corporate" && r.ruleName === "suspicious_login",
      )?.matched,
    ).toBe(false);
  });
});
