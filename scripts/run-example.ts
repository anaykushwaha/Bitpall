import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createSourceFile, formatDiagnostic } from "@bitpall/ast";
import { check } from "@bitpall/checker";
import { validateMockEvents } from "@bitpall/interpreter";
import { parse } from "@bitpall/parser";
import { runBitpallTests } from "@bitpall/test-runner";

function usage(): never {
  console.error("Usage: tsx scripts/run-example.ts <example-directory>");
  process.exit(1);
}

const exampleDir = process.argv[2];
if (!exampleDir) {
  usage();
}

console.log("Running Bitpall example...");

const root = resolve(exampleDir);
const policyPath = resolve(root, "policy.bitpall");
const eventsPath = resolve(root, "events.json");

const policyText = readFileSync(policyPath, "utf8");
const source = createSourceFile(policyPath, policyText);
const parsed = parse(source);

for (const diagnostic of parsed.diagnostics) {
  console.error(formatDiagnostic(diagnostic));
}

if (!parsed.program) {
  console.log("Policy: FAIL");
  console.error("Parse failed.");
  process.exit(1);
}
console.log("Policy: PASS");

const checked = check(parsed.program, source);
for (const diagnostic of checked.diagnostics) {
  console.error(formatDiagnostic(diagnostic));
}

if (checked.diagnostics.some((d) => d.severity === "error")) {
  console.log("Semantic check: FAIL");
  process.exit(1);
}
console.log("Semantic check: PASS");

let parsedJson: unknown;
try {
  parsedJson = JSON.parse(readFileSync(eventsPath, "utf8"));
} catch (error) {
  console.error(`Failed to load events: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

const validated = validateMockEvents(parsedJson);
if (!validated.ok) {
  for (const diagnostic of validated.diagnostics) {
    console.error(`${diagnostic.path}: ${diagnostic.message}`);
  }
  console.log("Events: FAIL");
  process.exit(1);
}

const testResult = runBitpallTests({
  program: checked.program,
  events: validated.events,
});

const matched = testResult.interpretResult.ruleResults.filter((r) => r.matched);
console.log(`Simulation: ${matched.length > 0 ? "MATCH" : "NO MATCH"}`);

const passedCount = testResult.tests.filter((t) => t.passed).length;
const failedCount = testResult.tests.length - passedCount;
console.log(`Tests: ${passedCount} passed, ${failedCount} failed`);

console.log("\n=== Rule results ===");
for (const rule of testResult.interpretResult.ruleResults) {
  console.log(
    `${rule.matched ? "MATCH" : "NO MATCH"} ${rule.ruleName}: ${rule.reason} (confidence=${rule.confidence}, sources=${rule.sources})`,
  );
}

console.log("\n=== Simulated responses (audit) ===");
for (const entry of testResult.interpretResult.auditLog) {
  console.log(`[${entry.id}] ${entry.result.status}: ${entry.result.message}`);
}

console.log("\nWARNING: Response actions are simulated only. No real systems were modified.");

if (!testResult.passed) {
  process.exit(1);
}
