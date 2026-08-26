import { describe, expect, it } from "vitest";
import { reportFilename } from "./exportReport.js";

describe("reportFilename", () => {
  it("slugifies rule names", () => {
    expect(reportFilename("suspicious_encryption_chain")).toBe(
      "bitpall-suspicious-encryption-chain-report.md",
    );
  });

  it("handles spaces and punctuation", () => {
    expect(reportFilename("Suspicious Account Takeover")).toBe(
      "bitpall-suspicious-account-takeover-report.md",
    );
  });

  it("falls back when empty after sanitization", () => {
    expect(reportFilename("???")).toBe("bitpall-detection-report.md");
  });
});
