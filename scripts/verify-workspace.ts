import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const required = [
  "package.json",
  "pnpm-workspace.yaml",
  "tsconfig.base.json",
  "packages/ast/package.json",
  "packages/lexer/package.json",
  "packages/parser/package.json",
  "packages/checker/package.json",
  "packages/interpreter/package.json",
  "packages/runtime/package.json",
  "packages/language-service/package.json",
  "packages/test-runner/package.json",
  "packages/exporters/package.json",
  "apps/playground/package.json",
  "examples/exploit-to-ransomware/policy.bitpall",
  "examples/account-takeover/policy.bitpall",
  "examples/data-exfiltration/policy.bitpall",
];

let failed = false;
for (const path of required) {
  const absolute = resolve(path);
  if (!existsSync(absolute)) {
    console.error(`Missing: ${path}`);
    failed = true;
  } else {
    console.log(`OK: ${path}`);
  }
}

const workspace = readFileSync(resolve("pnpm-workspace.yaml"), "utf8");
const expectedGlobs = ["apps/*", "packages/*", "tests/integration"];
for (const glob of expectedGlobs) {
  if (!workspace.includes(glob)) {
    console.error(`pnpm-workspace.yaml missing expected glob: ${glob}`);
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}

console.log("Workspace verification passed.");
