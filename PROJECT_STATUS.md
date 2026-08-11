# AegisScript Project Status

> AegisScript is currently an experimental defensive cybersecurity DSL. It is not ready to execute actions against real systems.

## Status metadata

| Field               | Value                                                                                                          |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| Project             | AegisScript                                                                                                    |
| Current phase       | Correctness hardening complete — demo examples next                                                            |
| Overall status      | PARTIAL                                                                                                        |
| Last updated        | 2026-08-11                                                                                                     |
| Current HEAD        | `0d6c07a0b7ae2c9b01fa104a821daf301d03f89a`                                                                     |
| Uncommitted changes | Correctness fix pass (observe backtracking, workspace rule IDs, playground separation) — **not yet committed** |
| Maintainer          | Project team                                                                                                   |
| Current milestone   | Hackathon demo readiness                                                                                       |

## Status legend

| Status      | Meaning                                                                      |
| ----------- | ---------------------------------------------------------------------------- |
| NOT STARTED | No meaningful design or implementation work has begun.                       |
| PLANNED     | Scope is defined, but implementation has not started.                        |
| IN PROGRESS | Active implementation is underway.                                           |
| BLOCKED     | Progress cannot continue until a dependency or decision is resolved.         |
| PARTIAL     | A limited subset works, but the feature is not complete.                     |
| COMPLETE    | Implementation, tests, and documentation are complete for the defined scope. |
| DEFERRED    | Intentionally postponed beyond the current roadmap.                          |

## Current project summary

AegisScript has a hardened vertical slice suitable for demoing detection-to-response policies against mock events. The interpreter now backtracks across observe candidates, the test runner scopes rule identities by workspace, and the playground separates Check / Run Simulation / Run Tests. Responses remain simulation-only.

## Phase roadmap

| Phase    | Scope                                             | Status      | Completion criteria                                                                                            |
| -------- | ------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------- |
| Phase 0  | Repository and workspace initialization           | COMPLETE    | Workspace installs successfully and root development commands are configured.                                  |
| Phase 1  | Source model, diagnostics, AST, lexer, and parser | COMPLETE    | Supported example parses into a typed AST with useful diagnostics and passing tests.                           |
| Phase 2  | Name resolution and semantic checker              | COMPLETE    | Semantic rules validated, including cross-kind duplicates and telemetry checks.                                |
| Phase 3  | Mock event interpreter                            | COMPLETE    | Ordered multi-stage matching with observe-candidate backtracking, confidence, telemetry, and event validation. |
| Phase 4  | Safe response runtime                             | COMPLETE    | Mock executor with approval and rollback metadata.                                                             |
| Phase 5  | Test runner and ransomware example                | COMPLETE    | Workspace-scoped expectations; ransomware example integration covers the full pipeline.                        |
| Phase 6  | Browser playground                                | PARTIAL     | Functional Check / Simulation / Tests; presentation polish and richer visualization remain.                    |
| Phase 7  | Language-service foundation                       | PARTIAL     | `analyzeSource` wraps parse+check; full LSP is not implemented.                                                |
| Phase 8  | Additional demo examples                          | NOT STARTED | Account-takeover and data-exfiltration examples fully implemented.                                             |
| Phase 9  | Exporters                                         | NOT STARTED | At least one deterministic export format.                                                                      |
| Phase 10 | Production adapters                               | DEFERRED    | Requires a separate security and architecture review.                                                          |

## Implemented

### Core language and pipeline

- Lexer, parser, AST, checker, interpreter, mock runtime, test-runner
- Ordered multi-stage temporal matching (`within` from observe; chronological stage order)
- Observe-candidate backtracking (later observe starts may succeed when earlier ones fail)
- Mock event validation (`validateMockEvents`)
- Minimum-chain confidence (missing confidence = 0)
- Telemetry-gated event eligibility
- Workspace-scoped rule identities in the test runner (`workspace::rule`)
- Ransomware example end-to-end
- Playground Check / Run Simulation / Run Tests as separate operations

## Next recommended task

**Implement the account-takeover end-to-end AegisScript example** under `examples/account-takeover/` (policy, events, expected result, README), with an integration test mirroring the ransomware coverage.

Hackathon priority order after that:

1. Complete data-exfiltration example
2. Improve playground presentation and execution visualization
3. Polish README / demo narrative
4. Add exporters only after the demo examples are solid

## Package status

| Package or application      | Status      | Notes                                                 |
| --------------------------- | ----------- | ----------------------------------------------------- |
| `apps/playground`           | PARTIAL     | Functional; polish and visualization remaining        |
| `packages/lexer`            | COMPLETE    | Tokenization and lexical diagnostics                  |
| `packages/ast`              | COMPLETE    | Typed AST, diagnostics, product naming                |
| `packages/parser`           | COMPLETE    | Recursive-descent parsing                             |
| `packages/checker`          | COMPLETE    | Semantic validation                                   |
| `packages/interpreter`      | COMPLETE    | Matching, confidence, telemetry, observe backtracking |
| `packages/runtime`          | COMPLETE    | Mock response execution for demo scope                |
| `packages/test-runner`      | COMPLETE    | Workspace-scoped `expect rule … to_match`             |
| `packages/language-service` | PARTIAL     | Thin analyze facade                                   |
| `packages/exporters`        | NOT STARTED | Scaffold only                                         |

## Example status

| Example               | Status      | Notes                               |
| --------------------- | ----------- | ----------------------------------- |
| exploit-to-ransomware | COMPLETE    | Full fixture + integration coverage |
| account-takeover      | NOT STARTED | README placeholder only             |
| data-exfiltration     | NOT STARTED | README placeholder only             |

## Verification status

| Check                    | Status   | Last run   | Notes                                                         |
| ------------------------ | -------- | ---------- | ------------------------------------------------------------- |
| Dependency installation  | COMPLETE | 2026-08-11 | `pnpm install`                                                |
| Formatting               | COMPLETE | 2026-08-11 | `pnpm format:check`                                           |
| Linting                  | COMPLETE | 2026-08-11 | `pnpm lint`                                                   |
| Type checking            | COMPLETE | 2026-08-11 | `pnpm check`                                                  |
| Unit + integration tests | COMPLETE | 2026-08-11 | **91** tests passed                                           |
| Production build         | COMPLETE | 2026-08-11 | Package tsc + playground Vite build                           |
| Example runner           | COMPLETE | 2026-08-11 | `pnpm example:ransomware`                                     |
| Playground launch        | PARTIAL  | 2026-08-11 | Build verified; interactive `pnpm dev` not smoke-tested in CI |

## Known limitations

- Account-takeover and data-exfiltration examples are placeholders.
- Playground visualization/polish is limited (textarea editor, basic panels).
- Exporters are not implemented.
- No LSP / VS Code extension / vendor adapters.
- Soft keywords may appear in identifier positions.
- The AegisScript name may change later.
- No backwards-compatibility guarantee while experimental.

## Language design consideration

`approval required for terminate_process;` is ambiguous: it can be read as either “this action requires approval” (gate) or “request this action pending approval” (proposal). The current runtime treats it as proposing a pending approval-gated action. Grammar redesign is deferred and should not be mixed into demo-example work.

## Safety constraints

- Response actions must be simulated.
- Runtime behaviour must default to deny.
- Unsupported actions must produce explicit diagnostics or rejected action results.
- Approval-gated actions must not be marked as executed.
- Rollback actions must be recorded separately from executed actions.
- Tests must not depend on access to real security platforms.
- Examples must use fictional organizations, assets, accounts, and event data.
- Secrets and credentials must never be committed.

## Current blockers

No blockers have been recorded.

## Architectural decisions

### ADR-001 through ADR-010

Prior ADRs remain accepted (TypeScript, hand-written parser, simulation-first runtime, package boundaries, product naming, soft keywords, source exports, min-chain confidence, telemetry gating, chronological multi-stage matching).

### ADR-011: Observe-candidate backtracking

**Status:** Accepted

When multiple events match `observe`, try each candidate in chronological order until one produces a complete valid chain. First complete success wins; do not stop after the first failing candidate.

### ADR-012: Workspace-scoped rule identity in tests

**Status:** Accepted

Test assertions resolve rules as `workspaceName::ruleName` so identically named rules in different workspaces do not collide.

### ADR-013: Separated playground operations

**Status:** Accepted

Check validates only. Run Simulation calls the interpreter. Run Tests calls the test-runner. Simulation must not require DSL test declarations.

## Technical debt

### TD-001: Package exports point at TypeScript sources

- Status: Open
- Introduced: 2026-08-06

### TD-002: Exporters remain scaffolds

- Status: Open
- Introduced: 2026-08-06
- Updated: 2026-08-11 — deferred behind demo examples

### TD-003: Playground uses a plain textarea

- Status: Open
- Introduced: 2026-08-06

### TD-004: Approval statement semantics are ambiguous

- Status: Open
- Introduced: 2026-08-11
- Affected area: grammar / respond blocks / runtime interpretation
- Reason: current syntax conflates gate declaration and action proposal
- Consequence: demo narrative must carefully explain pending approval behaviour
- Recommended resolution: dedicated language-design pass after demo examples

## Change log

### 2026-08-11 (correctness fix pass)

- Interpreter now backtracks across observe candidates until a complete chain succeeds.
- Test runner uses workspace-scoped rule identities.
- Playground Check / Run Simulation / Run Tests are separate operations with shared compile helpers.
- Added regression tests for observe backtracking, cross-workspace rule names, and pipeline separation.
- Updated recommended next task to account-takeover example (not exporters).
- Recorded approval-syntax ambiguity as a language design consideration.
- Verification: 91 tests passing on this uncommitted fix set; HEAD remains `0d6c07a0…` without these changes until committed.

### 2026-08-11 (semantics hardening)

- Ordered multi-stage matching, telemetry gating, min confidence, event validation, test-runner implementation.
- Phase 5 marked complete for initial test-runner scope.

### 2026-08-06

- Initial monorepo, vertical slice, ransomware example, playground scaffold.

### YYYY-MM-DD

- Created the initial project-status document.

---

## Maintenance instructions

Update this document whenever implementation status, roadmap, limitations, verification, or architectural decisions change. Never mark work complete based only on files or interfaces existing.
