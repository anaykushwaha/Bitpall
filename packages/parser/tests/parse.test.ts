import { createSourceFile } from "@bitpall/ast";
import { describe, expect, it } from "vitest";
import { parse } from "../src/index.js";

const EXAMPLE = `
workspace corporate_network {
  asset endpoint finance_laptop {
    criticality = "high";
  }

  telemetry edr {
    source = "endpoint-agent";
  }

  rule suspicious_encryption_chain {
    observe process_start where process.name == "powershell.exe";

    then file_write
      where file.extension == ".encrypted"
      within 2m;

    require confidence >= 0.80;
    require sources >= 2;

    respond {
      isolate endpoint finance_laptop;
      preserve evidence;
      approval required for terminate_process;
    }

    rollback {
      reconnect endpoint finance_laptop;
    }
  }

  test ransomware_sequence {
    expect rule suspicious_encryption_chain to_match;
  }
}
`;

describe("parser", () => {
  it("parses a minimal valid workspace", () => {
    const result = parse(createSourceFile("min.bitpall", "workspace demo {\n}\n"));
    expect(result.diagnostics.filter((d) => d.severity === "error")).toHaveLength(0);
    expect(result.program?.workspaces).toHaveLength(1);
    expect(result.program?.workspaces[0]?.name.name).toBe("demo");
  });

  it("parses assets and telemetry", () => {
    const result = parse(
      createSourceFile(
        "at.bitpall",
        `workspace w {
  asset endpoint laptop { criticality = "high"; }
  telemetry edr { source = "agent"; }
}`,
      ),
    );
    expect(result.diagnostics.filter((d) => d.severity === "error")).toHaveLength(0);
    const members = result.program?.workspaces[0]?.members ?? [];
    expect(members.some((m) => m.kind === "AssetDeclaration")).toBe(true);
    expect(members.some((m) => m.kind === "TelemetryDeclaration")).toBe(true);
  });

  it("parses a complete rule with observe/then/response/rollback", () => {
    const result = parse(createSourceFile("policy.bitpall", EXAMPLE));
    const errors = result.diagnostics.filter((d) => d.severity === "error");
    expect(errors).toEqual([]);
    const rule = result.program?.workspaces[0]?.members.find((m) => m.kind === "RuleDeclaration");
    expect(rule?.kind).toBe("RuleDeclaration");
    if (rule?.kind === "RuleDeclaration") {
      expect(rule.observe?.eventType.name).toBe("process_start");
      expect(rule.thenStages).toHaveLength(1);
      expect(rule.respond?.statements).toHaveLength(3);
      expect(rule.rollback?.statements).toHaveLength(1);
      expect(rule.requires).toHaveLength(2);
    }
  });

  it("parses identity response and rollback actions", () => {
    const result = parse(
      createSourceFile(
        "identity.bitpall",
        `workspace identity_ops {
  asset user finance_analyst { criticality = "high"; }
  telemetry idp { source = "identity-provider"; }
  rule takeover {
    observe successful_login where user.name == "finance_analyst";
    respond {
      revoke sessions user finance_analyst;
      preserve evidence;
      disable account finance_analyst;
    }
    rollback {
      reenable account finance_analyst;
    }
  }
}`,
      ),
    );
    expect(result.diagnostics.filter((d) => d.severity === "error")).toEqual([]);
    const rule = result.program?.workspaces[0]?.members.find((m) => m.kind === "RuleDeclaration");
    expect(rule?.kind).toBe("RuleDeclaration");
    if (rule?.kind === "RuleDeclaration") {
      expect(rule.respond?.statements.map((s) => s.kind)).toEqual([
        "RevokeSessionsAction",
        "PreserveEvidenceAction",
        "DisableAccountAction",
      ]);
      expect(rule.rollback?.statements.map((s) => s.kind)).toEqual(["ReenableAccountAction"]);
    }
  });

  it("parses tests", () => {
    const result = parse(createSourceFile("policy.bitpall", EXAMPLE));
    const test = result.program?.workspaces[0]?.members.find((m) => m.kind === "TestDeclaration");
    expect(test?.kind).toBe("TestDeclaration");
    if (test?.kind === "TestDeclaration") {
      expect(test.statements[0]?.kind).toBe("ExpectRuleMatch");
      if (test.statements[0]?.kind === "ExpectRuleMatch") {
        expect(test.statements[0].ruleName.name).toBe("suspicious_encryption_chain");
        expect(test.statements[0].expectation).toBe("match");
      }
    }
  });

  it("parses to_not_match and confidence assertions", () => {
    const result = parse(
      createSourceFile(
        "policy.bitpall",
        `workspace w {
  rule r { observe process_start where true; }
  test t {
    expect rule r to_match;
    expect rule r to_not_match;
    expect rule r confidence >= 0.9;
    expect rule r confidence < 0.5;
  }
}`,
      ),
    );
    expect(result.diagnostics.filter((d) => d.severity === "error")).toEqual([]);
    const test = result.program?.workspaces[0]?.members.find((m) => m.kind === "TestDeclaration");
    expect(test?.kind).toBe("TestDeclaration");
    if (test?.kind !== "TestDeclaration") return;
    expect(test.statements).toHaveLength(4);
    expect(test.statements[0]).toMatchObject({ kind: "ExpectRuleMatch", expectation: "match" });
    expect(test.statements[1]).toMatchObject({ kind: "ExpectRuleMatch", expectation: "not_match" });
    expect(test.statements[2]).toMatchObject({
      kind: "ExpectRuleConfidence",
      operator: ">=",
      value: { value: 0.9 },
    });
    expect(test.statements[3]).toMatchObject({
      kind: "ExpectRuleConfidence",
      operator: "<",
      value: { value: 0.5 },
    });
  });

  it("reports malformed confidence assertions", () => {
    const result = parse(
      createSourceFile(
        "bad.bitpall",
        `workspace w {
  rule r { observe process_start where true; }
  test t { expect rule r confidence; }
}`,
      ),
    );
    expect(result.diagnostics.some((d) => d.code === "BITPALL2001")).toBe(true);
  });

  it("reports invalid confidence comparators", () => {
    const result = parse(
      createSourceFile(
        "bad.bitpall",
        `workspace w {
  rule r { observe process_start where true; }
  test t { expect rule r confidence = 0.9; }
}`,
      ),
    );
    expect(result.diagnostics.some((d) => d.code === "BITPALL2001")).toBe(true);
  });

  it("reports missing semicolons", () => {
    const result = parse(
      createSourceFile(
        "bad.bitpall",
        `workspace w {
  asset endpoint laptop {
    criticality = "high"
  }
}`,
      ),
    );
    expect(result.diagnostics.some((d) => d.code === "BITPALL2002")).toBe(true);
  });

  it("reports missing braces", () => {
    const result = parse(
      createSourceFile("bad.bitpall", 'workspace w { asset endpoint x { criticality = "high"; }'),
    );
    expect(result.diagnostics.some((d) => d.code === "BITPALL2003")).toBe(true);
  });

  it("reports unexpected tokens", () => {
    const result = parse(createSourceFile("bad.bitpall", "workspace w { foobar x; }"));
    expect(result.diagnostics.some((d) => d.code === "BITPALL2001")).toBe(true);
  });

  it("recovers after malformed members and continues parsing", () => {
    const result = parse(
      createSourceFile(
        "recover.bitpall",
        `workspace w {
  !!!;
  asset endpoint laptop { criticality = "high"; }
}`,
      ),
    );
    const asset = result.program?.workspaces[0]?.members.find((m) => m.kind === "AssetDeclaration");
    expect(asset).toBeTruthy();
    expect(result.diagnostics.length).toBeGreaterThan(0);
  });

  it("reports duplicate observe stages", () => {
    const result = parse(
      createSourceFile(
        "dup.bitpall",
        `workspace w {
  rule r {
    observe a where process.name == "a";
    observe b where process.name == "b";
  }
}`,
      ),
    );
    expect(result.diagnostics.some((d) => d.code === "BITPALL3011")).toBe(true);
  });
});
