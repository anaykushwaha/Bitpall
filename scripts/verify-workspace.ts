import { existsSync } from "node:fs";
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
  "apps/playground/package.json",
  "examples/exploit-to-ransomware/policy.aegis",
  "examples/account-takeover/policy.aegis",
  "examples/data-exfiltration/policy.aegis",
  "PROJECT_STATUS.md",
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

if (failed) {
  process.exit(1);
}

console.log("Workspace verification passed.");
