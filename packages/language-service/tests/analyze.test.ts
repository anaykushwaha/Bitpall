import { describe, expect, it } from "vitest";
import { analyzeSource } from "../src/index.js";

describe("language-service", () => {
  it("returns diagnostics for invalid source", () => {
    const result = analyzeSource("x.bitpall", "workspace {");
    expect(result.diagnostics.length).toBeGreaterThan(0);
    expect(result.formattedDiagnostics[0]).toContain("AEGIS");
  });

  it("analyzes a minimal valid workspace", () => {
    const result = analyzeSource(
      "ok.bitpall",
      `workspace demo {
  telemetry edr { source = "agent"; }
}`,
    );
    expect(result.program).not.toBeNull();
    expect(result.diagnostics.filter((d) => d.severity === "error")).toEqual([]);
  });
});
