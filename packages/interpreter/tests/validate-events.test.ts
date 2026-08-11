import { describe, expect, it } from "vitest";
import { validateMockEvents } from "../src/index.js";

describe("validateMockEvents", () => {
  const valid = [
    {
      id: "e1",
      type: "process_start",
      timestamp: "2026-08-06T12:00:00.000Z",
      properties: { process: { name: "x" } },
      source: "endpoint-agent",
      confidence: 0.9,
    },
  ];

  it("accepts valid input", () => {
    const result = validateMockEvents(valid);
    expect(result.ok).toBe(true);
    expect(result.events).toHaveLength(1);
    expect(result.diagnostics).toEqual([]);
  });

  it("rejects non-array root", () => {
    const result = validateMockEvents({ id: "x" });
    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]?.message).toMatch(/array/i);
  });

  it("rejects malformed event", () => {
    const result = validateMockEvents(["not-an-object"]);
    expect(result.ok).toBe(false);
    expect(result.diagnostics.some((d) => d.message.includes("object"))).toBe(true);
  });

  it("rejects missing id", () => {
    const result = validateMockEvents([{ type: "x", timestamp: 1, properties: {} }]);
    expect(result.diagnostics.some((d) => d.path.endsWith(".id"))).toBe(true);
  });

  it("rejects duplicate ids", () => {
    const result = validateMockEvents([
      { id: "dup", type: "a", timestamp: 1, properties: {} },
      { id: "dup", type: "b", timestamp: 2, properties: {} },
    ]);
    expect(result.diagnostics.some((d) => /Duplicate event id/i.test(d.message))).toBe(true);
  });

  it("rejects missing type", () => {
    const result = validateMockEvents([{ id: "e", timestamp: 1, properties: {} }]);
    expect(result.diagnostics.some((d) => d.path.endsWith(".type"))).toBe(true);
  });

  it("rejects invalid timestamp", () => {
    const result = validateMockEvents([
      { id: "e", type: "a", timestamp: "not-a-date", properties: {} },
    ]);
    expect(result.diagnostics.some((d) => d.path.endsWith(".timestamp"))).toBe(true);
  });

  it("rejects invalid properties", () => {
    const result = validateMockEvents([{ id: "e", type: "a", timestamp: 1, properties: [] }]);
    expect(result.diagnostics.some((d) => d.path.endsWith(".properties"))).toBe(true);
  });

  it("rejects invalid source", () => {
    const result = validateMockEvents([
      { id: "e", type: "a", timestamp: 1, properties: {}, source: "" },
    ]);
    expect(result.diagnostics.some((d) => d.path.endsWith(".source"))).toBe(true);
  });

  it("rejects invalid confidence type", () => {
    const result = validateMockEvents([
      { id: "e", type: "a", timestamp: 1, properties: {}, confidence: "high" },
    ]);
    expect(result.diagnostics.some((d) => d.path.endsWith(".confidence"))).toBe(true);
  });

  it("rejects confidence below zero", () => {
    const result = validateMockEvents([
      { id: "e", type: "a", timestamp: 1, properties: {}, confidence: -0.1 },
    ]);
    expect(result.diagnostics.some((d) => /between 0 and 1/i.test(d.message))).toBe(true);
  });

  it("rejects confidence above one", () => {
    const result = validateMockEvents([
      { id: "e", type: "a", timestamp: 1, properties: {}, confidence: 1.1 },
    ]);
    expect(result.diagnostics.some((d) => /between 0 and 1/i.test(d.message))).toBe(true);
  });
});
