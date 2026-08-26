import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSourceFile } from "@bitpall/ast";
import { check } from "@bitpall/checker";
import { interpret, validateMockEvents } from "@bitpall/interpreter";
import { parse } from "@bitpall/parser";
import { describe, expect, it } from "vitest";
import { exportDocumentation, exportMarkdownReport } from "../src/index.js";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function loadExample(exampleDir: string, eventsFile = "events.json") {
  const root = resolve(repoRoot, "examples", exampleDir);
  const policyText = readFileSync(resolve(root, "policy.bitpall"), "utf8");
  const source = createSourceFile("policy.bitpall", policyText);
  const parsed = parse(source);
  expect(parsed.program).not.toBeNull();
  const checked = check(parsed.program!, source);
  expect(checked.diagnostics.filter((d) => d.severity === "error")).toEqual([]);
  const raw: unknown = JSON.parse(readFileSync(resolve(root, eventsFile), "utf8"));
  const validated = validateMockEvents(raw);
  expect(validated.ok).toBe(true);
  const result = interpret(checked.program, validated.events);
  return { program: checked.program, events: validated.events, result };
}

describe("Markdown exporter", () => {
  it("exports a successful ransomware detection with responses and approvals", () => {
    const { program, events, result } = loadExample("exploit-to-ransomware");
    const markdown = exportDocumentation({
      format: "markdown",
      program,
      result,
      events,
      scenarioName: "Exploit → Ransomware",
    });

    expect(markdown).toContain("# Bitpall Detection Report");
    expect(markdown).toContain("suspicious_encryption_chain");
    expect(markdown).toContain("**Status:** Matched");
    expect(markdown).toContain("Confidence must be >= `0.8`");
    expect(markdown).toContain("## Matched Event Chain");
    expect(markdown).toContain("process_start");
    expect(markdown).toContain("file_write");
    expect(markdown).toContain("| Action | Status | Approval Required |");
    expect(markdown).toContain("Isolate endpoint (finance_laptop)");
    expect(markdown).toContain("Simulated");
    expect(markdown).toContain("Pending approval");
    expect(markdown).toContain("terminate_process");
    expect(markdown).toContain("## Rollback Plan");
    expect(markdown).toContain("Reconnect endpoint");
    expect(markdown).toContain("simulation-only");
  });

  it("exports a no-match report without crashing", () => {
    const { program, events, result } = loadExample(
      "exploit-to-ransomware",
      "events-incomplete.json",
    );
    const markdown = exportMarkdownReport({
      program,
      result,
      events,
      scenarioName: "Exploit → Ransomware",
    });

    expect(result.ruleResults[0]?.matched).toBe(false);
    expect(markdown).toContain("**Status:** No match");
    expect(markdown).toContain(
      "No response actions were simulated because the detection rule did not match.",
    );
  });

  it("surfaces requirement failures from interpreter evaluations", () => {
    const { program, events, result } = loadExample(
      "exploit-to-ransomware",
      "events-low-confidence.json",
    );
    const markdown = exportDocumentation({
      format: "markdown",
      program,
      result,
      events,
    });

    expect(result.ruleResults[0]?.matched).toBe(false);
    expect(markdown).toContain("**Status:** No match");
    expect(markdown).toMatch(/confidence/i);
    expect(markdown).toContain("[fail]");
  });

  it("represents approval-required responses for account takeover", () => {
    const { program, events, result } = loadExample("account-takeover");
    const markdown = exportDocumentation({
      format: "markdown",
      program,
      result,
      events,
      scenarioName: "Account Takeover",
    });

    expect(markdown).toContain("**Status:** Matched");
    expect(markdown).toContain("Disable account");
    expect(markdown).toContain("Pending approval");
    expect(markdown).toContain("## Safety / Approval Requirements");
    expect(markdown).toMatch(/disable.?account/i);
  });

  it("is deterministic for identical input", () => {
    const { program, events, result } = loadExample("data-exfiltration");
    const first = exportDocumentation({
      format: "markdown",
      program,
      result,
      events,
      scenarioName: "Data Exfiltration",
    });
    const second = exportDocumentation({
      format: "markdown",
      program,
      result,
      events,
      scenarioName: "Data Exfiltration",
    });
    expect(first).toBe(second);
  });

  it("escapes Markdown-sensitive characters in event attributes", () => {
    const { program } = loadExample("exploit-to-ransomware");
    const events = [
      {
        id: "pipe|id",
        type: "process_start",
        timestamp: "2026-08-06T12:00:00.000Z",
        source: "endpoint-agent",
        confidence: 0.9,
        properties: {
          process: { name: "powershell.exe" },
        },
      },
      {
        id: "evt-2",
        type: "file_write",
        timestamp: "2026-08-06T12:00:30.000Z",
        source: "file-monitor",
        confidence: 0.9,
        properties: {
          file: { extension: ".encrypted", path: "/tmp/a|b.md" },
        },
      },
    ];
    const interpreted = interpret(program, events);
    expect(interpreted.ruleResults[0]?.matched).toBe(true);
    const markdown = exportDocumentation({
      format: "markdown",
      program,
      result: interpreted,
      events,
    });
    expect(markdown).toContain("pipe\\|id");
    expect(markdown).toContain("/tmp/a\\|b.md");
    expect(markdown).toContain("| Action | Status | Approval Required |");
    expect(markdown.split("\n").filter((line) => line.startsWith("| ")).length).toBeGreaterThan(2);
  });

  it("works when optional events and scenario metadata are omitted", () => {
    const { program, result } = loadExample("data-exfiltration");
    const markdown = exportDocumentation({
      format: "markdown",
      program,
      result,
    });
    expect(markdown).toContain("# Bitpall Detection Report");
    expect(markdown).toContain("sensitive_exfiltration_chain");
    expect(markdown).not.toContain("**Scenario:**");
  });

  it("rejects unsupported formats", () => {
    const { program, result } = loadExample("exploit-to-ransomware");
    expect(() =>
      exportDocumentation({
        format: "json",
        program,
        result,
      }),
    ).toThrow(/does not implement format 'json'/i);
  });

  it("rejects missing rule results", () => {
    const { program } = loadExample("exploit-to-ransomware");
    expect(() =>
      exportDocumentation({
        format: "markdown",
        program,
        result: {
          ruleResults: [],
          trace: [],
          auditLog: [],
          pendingApprovals: [],
          rollbackActions: [],
        },
      }),
    ).toThrow(/no rule results/i);
  });
});
