import { createSourceFile } from "@aegisscript/ast";
import { parse } from "@aegisscript/parser";
import { describe, expect, it } from "vitest";
import { check } from "../src/index.js";

function checkSource(text: string) {
  const source = createSourceFile("test.aegis", text);
  const parsed = parse(source);
  expect(parsed.program).not.toBeNull();
  const parseErrors = parsed.diagnostics.filter((d) => d.severity === "error");
  const checked = check(parsed.program!, source);
  return {
    diagnostics: [...parseErrors, ...checked.diagnostics],
    program: checked.program,
    parseDiagnostics: parsed.diagnostics,
  };
}

const VALID = `
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

  it("detects same-kind duplicate declaration", () => {
    const result = checkSource(`
workspace w {
  telemetry edr { source = "a"; }
  asset endpoint laptop { criticality = "high"; }
  asset endpoint laptop { criticality = "low"; }
}
`);
    expect(result.diagnostics.some((d) => d.code === "AEGIS3001")).toBe(true);
  });

  it("detects cross-kind duplicate declaration", () => {
    const result = checkSource(`
workspace w {
  telemetry edr { source = "a"; }
  asset endpoint suspicious { criticality = "high"; }
  rule suspicious {
    observe process_start where process.name == "x";
  }
}
`);
    const dup = result.diagnostics.find((d) => d.code === "AEGIS3001");
    expect(dup).toBeTruthy();
    expect(dup?.message).toMatch(/rule conflicts with existing asset/i);
  });

  it("detects duplicate workspace and points related to the original", () => {
    const result = checkSource(`
workspace first {
  telemetry edr { source = "a"; }
}
workspace first {
  telemetry edr { source = "b"; }
}
`);
    const dup = result.diagnostics.find((d) => d.code === "AEGIS3001");
    expect(dup).toBeTruthy();
    expect(dup?.related?.[0]?.range.start.line).toBe(2);
  });

  it("detects duplicate observe via parser diagnostic", () => {
    const result = checkSource(`
workspace w {
  telemetry edr { source = "a"; }
  rule bad {
    observe a where process.name == "a";
    observe b where process.name == "b";
  }
}
`);
    expect(result.diagnostics.some((d) => d.code === "AEGIS3011")).toBe(true);
  });

  it("detects duplicate respond", () => {
    const result = checkSource(`
workspace w {
  telemetry edr { source = "a"; }
  rule bad {
    observe a where process.name == "a";
    respond { preserve evidence; }
    respond { preserve evidence; }
  }
}
`);
    expect(result.diagnostics.some((d) => d.code === "AEGIS3011")).toBe(true);
  });

  it("detects duplicate rollback", () => {
    const result = checkSource(`
workspace w {
  telemetry edr { source = "a"; }
  asset endpoint laptop { criticality = "high"; }
  rule bad {
    observe a where process.name == "a";
    respond { isolate endpoint laptop; }
    rollback { reconnect endpoint laptop; }
    rollback { reconnect endpoint laptop; }
  }
}
`);
    expect(result.diagnostics.some((d) => d.code === "AEGIS3011")).toBe(true);
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

  it("rejects decimal source thresholds", () => {
    const result = checkSource(`
workspace w {
  telemetry edr { source = "a"; }
  rule r {
    observe process_start where process.name == "x";
    require sources >= 1.5;
  }
}
`);
    expect(result.diagnostics.some((d) => d.code === "AEGIS3012")).toBe(true);
  });

  it("rejects negative source thresholds when a negative literal is present", () => {
    // Negative literals are uncommon in the grammar; guard the checker path via raw AST.
    const source = createSourceFile(
      "test.aegis",
      `
workspace w {
  telemetry edr { source = "a"; }
  rule r {
    observe process_start where process.name == "x";
    require sources >= 0;
  }
}
`,
    );
    const parsed = parse(source);
    expect(parsed.program).not.toBeNull();
    const program = parsed.program!;
    const rule = program.workspaces[0]?.members.find((m) => m.kind === "RuleDeclaration");
    expect(rule?.kind).toBe("RuleDeclaration");
    if (rule?.kind === "RuleDeclaration" && rule.requires[0]) {
      const mutated = {
        ...program,
        workspaces: [
          {
            ...program.workspaces[0]!,
            members: [
              program.workspaces[0]!.members[0]!,
              {
                ...rule,
                requires: [
                  {
                    ...rule.requires[0],
                    value: {
                      ...rule.requires[0].value,
                      value: -1,
                      raw: "-1",
                    },
                  },
                ],
              },
            ],
          },
        ],
      };
      const result = check(mutated, source);
      expect(result.diagnostics.some((d) => d.code === "AEGIS3012")).toBe(true);
    }
  });

  it("accepts zero as a sources threshold", () => {
    const result = checkSource(`
workspace w {
  telemetry edr { source = "a"; }
  rule r {
    observe process_start where process.name == "x";
    require sources >= 0;
  }
}
`);
    expect(result.diagnostics.filter((d) => d.code === "AEGIS3012")).toEqual([]);
  });

  it("rejects duplicate telemetry source strings", () => {
    const result = checkSource(`
workspace w {
  telemetry edr { source = "shared"; }
  telemetry other { source = "shared"; }
}
`);
    expect(result.diagnostics.some((d) => d.code === "AEGIS3014")).toBe(true);
  });

  it("rejects malformed telemetry source property", () => {
    const result = checkSource(`
workspace w {
  telemetry edr { source = 12; }
}
`);
    expect(result.diagnostics.some((d) => d.code === "AEGIS3013")).toBe(true);
  });

  it("rejects missing telemetry source property", () => {
    const result = checkSource(`
workspace w {
  telemetry edr { label = "x"; }
}
`);
    expect(result.diagnostics.some((d) => d.code === "AEGIS3013")).toBe(true);
  });
});
