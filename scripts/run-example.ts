import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createSourceFile, formatDiagnostic } from "@aegisscript/ast";
import { check } from "@aegisscript/checker";
import { interpret, type MockSecurityEvent } from "@aegisscript/interpreter";
import { parse } from "@aegisscript/parser";

function usage(): never {
  console.error("Usage: tsx scripts/run-example.ts <example-directory>");
  process.exit(1);
}

const exampleDir = process.argv[2];
if (!exampleDir) {
  usage();
}

const root = resolve(exampleDir);
const policyPath = resolve(root, "policy.aegis");
const eventsPath = resolve(root, "events.json");

const policyText = readFileSync(policyPath, "utf8");
const source = createSourceFile(policyPath, policyText);
const parsed = parse(source);

for (const diagnostic of parsed.diagnostics) {
  console.error(formatDiagnostic(diagnostic));
}

if (!parsed.program) {
  console.error("Parse failed.");
  process.exit(1);
}

const checked = check(parsed.program, source);
for (const diagnostic of checked.diagnostics) {
  console.error(formatDiagnostic(diagnostic));
}

if (checked.diagnostics.some((d) => d.severity === "error")) {
  console.error("Semantic check failed.");
  process.exit(1);
}

let events: MockSecurityEvent[];
try {
  events = JSON.parse(readFileSync(eventsPath, "utf8")) as MockSecurityEvent[];
  if (!Array.isArray(events)) {
    throw new Error("events.json must contain an array");
  }
} catch (error) {
  console.error(`Failed to load events: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

const result = interpret(checked.program, events);

console.log("=== Rule results ===");
for (const rule of result.ruleResults) {
  console.log(
    `${rule.matched ? "MATCH" : "NO MATCH"} ${rule.ruleName}: ${rule.reason} (confidence=${rule.confidence}, sources=${rule.sources})`,
  );
}

console.log("\n=== Simulated responses (audit) ===");
for (const entry of result.auditLog) {
  console.log(`[${entry.id}] ${entry.result.status}: ${entry.result.message}`);
}

console.log("\nWARNING: Response actions are simulated only. No real systems were modified.");
