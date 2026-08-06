import { createSourceFile } from "@aegisscript/ast";
import { parse } from "@aegisscript/parser";
import { describe, expect, it } from "vitest";
import { check } from "../src/index.js";

function checkSource(text: string) {
  const source = createSourceFile("test.aegis", text);
  const parsed = parse(source);
  expect(parsed.program).not.toBeNull();
  return check(parsed.program!, source);
}

const VALID = `
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
  test ransomware_sequence {
    expect rule suspicious_encryption_chain to_match;
  }
}
`;

describe("checker", () => {
  it("accepts the valid example with no semantic errors", () => {
    const result = checkSource(VALID);
    expect(result.diagnostics.filter((d) => d.severity === "error")).toEqual([]);
  });

  it("detects duplicate names", () => {
    const result = checkSource(`
workspace w {
  telemetry edr { source = "a"; }
  asset endpoint laptop { criticality = "high"; }
  asset endpoint laptop { criticality = "low"; }
}
`);
    expect(result.diagnostics.some((d) => d.code === "AEGIS3001")).toBe(true);
  });

  it("detects unknown assets", () => {
    const result = checkSource(`
workspace w {
  telemetry edr { source = "a"; }
  rule r {
    observe process_start where process.name == "x";
    respond { isolate endpoint missing_host; }
  }
}
`);
    expect(result.diagnostics.some((d) => d.code === "AEGIS3002")).toBe(true);
  });

  it("detects unknown rules in tests", () => {
    const result = checkSource(`
workspace w {
  telemetry edr { source = "a"; }
  test t { expect rule missing_rule to_match; }
}
`);
    expect(result.diagnostics.some((d) => d.code === "AEGIS3003")).toBe(true);
  });

  it("detects invalid confidence", () => {
    const result = checkSource(`
workspace w {
  telemetry edr { source = "a"; }
  rule r {
    observe process_start where process.name == "x";
    require confidence >= 1.5;
  }
}
`);
    expect(result.diagnostics.some((d) => d.code === "AEGIS3004")).toBe(true);
  });

  it("detects invalid duration", () => {
    const result = checkSource(`
workspace w {
  telemetry edr { source = "a"; }
  rule r {
    observe process_start where process.name == "x";
    then file_write where file.extension == ".encrypted" within 0m;
  }
}
`);
    expect(result.diagnostics.some((d) => d.code === "AEGIS3005")).toBe(true);
  });

  it("detects rollback without response", () => {
    const result = checkSource(`
workspace w {
  telemetry edr { source = "a"; }
  asset endpoint laptop { criticality = "high"; }
  rule r {
    observe process_start where process.name == "x";
    rollback { reconnect endpoint laptop; }
  }
}
`);
    expect(result.diagnostics.some((d) => d.code === "AEGIS3008")).toBe(true);
  });
});
