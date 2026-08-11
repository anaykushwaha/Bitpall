# AegisScript Project Status

> AegisScript is currently an experimental defensive cybersecurity DSL. It is not ready to execute actions against real systems.

## Status metadata

| Field               | Value                                                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Project             | AegisScript                                                                                                              |
| Current phase       | Multi-scenario demo + playground polish — hackathon packaging next                                                       |
| Overall status      | PARTIAL                                                                                                                  |
| Last updated        | 2026-08-11                                                                                                               |
| Current HEAD        | `55e3f330a6a5c688b15da9119fecf8cb3aba8b96`                                                                               |
| Uncommitted changes | Account-takeover + data-exfiltration examples, identity response actions, playground demo polish — **not yet committed** |
| Maintainer          | Project team                                                                                                             |
| Current milestone   | Hackathon demo readiness                                                                                                 |

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

AegisScript can express the same declarative detection-to-response workflow across three cybersecurity domains: exploit-to-ransomware, account takeover, and data exfiltration. The interpreter performs deterministic ordered event-chain search with backtracking. Identity containment uses reusable `revoke sessions` / `disable account` / `reenable account` actions in the mock runtime. The playground loads all three scenarios and presents detection summary, matched event chain, response plan, and DSL test results.

## Phase roadmap

| Phase    | Scope                                             | Status      | Completion criteria                                                                                   |
| -------- | ------------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------- |
| Phase 0  | Repository and workspace initialization           | COMPLETE    | Workspace installs successfully and root development commands are configured.                         |
| Phase 1  | Source model, diagnostics, AST, lexer, and parser | COMPLETE    | Supported example parses into a typed AST with useful diagnostics and passing tests.                  |
| Phase 2  | Name resolution and semantic checker              | COMPLETE    | Semantic rules validated, including cross-kind duplicates and telemetry checks.                       |
| Phase 3  | Mock event interpreter                            | COMPLETE    | Complete for current hackathon/demo semantics: ordered chain search with observe + then backtracking. |
| Phase 4  | Safe response runtime                             | COMPLETE    | Mock executor with approval and rollback metadata, including identity actions.                        |
| Phase 5  | Test runner and ransomware example                | COMPLETE    | Workspace-scoped expectations; ransomware example integration covers the full pipeline.               |
| Phase 6  | Browser playground                                | COMPLETE    | Scenario switcher + detection/event-chain/response presentation for demo scope.                       |
| Phase 7  | Language-service foundation                       | PARTIAL     | `analyzeSource` wraps parse+check; full LSP is not implemented.                                       |
| Phase 8  | Additional demo examples                          | COMPLETE    | Account-takeover and data-exfiltration examples fully implemented with fixtures and tests.            |
| Phase 9  | Exporters                                         | NOT STARTED | At least one deterministic export format.                                                             |
| Phase 10 | Production adapters                               | DEFERRED    | Requires a separate security and architecture review.                                                 |

## Implemented

### Core language and pipeline

- Lexer, parser, AST, checker, interpreter, mock runtime, test-runner
- Ordered multi-stage temporal matching with deterministic chain-search backtracking
- Identity responses: `revoke sessions user`, `disable account`, `reenable account`
- Endpoint responses: isolate / preserve / terminate (approval) / reconnect
- Three end-to-end examples with positive and negative fixtures
- Playground scenario selector and security-demo oriented result panels

## Next recommended task

**Final visual polish, demo script/video, and Devpost submission packaging.**

Optional later engineering (not required for the demo narrative):

1. Exporters
2. LSP / VS Code extension
3. Production adapters (explicitly out of hackathon scope)

## Package status

| Package or application      | Status                                        | Notes                                                                         |
| --------------------------- | --------------------------------------------- | ----------------------------------------------------------------------------- |
| `apps/playground`           | COMPLETE for demo scope                       | Scenario switcher; detection, chain, response, and test panels                |
| `packages/lexer`            | COMPLETE                                      | Tokenization and lexical diagnostics                                          |
| `packages/ast`              | COMPLETE                                      | Typed AST, diagnostics, product naming                                        |
| `packages/parser`           | COMPLETE                                      | Recursive-descent parsing                                                     |
| `packages/checker`          | COMPLETE                                      | Semantic validation                                                           |
| `packages/interpreter`      | COMPLETE for current hackathon/demo semantics | Chain search across observe/`then` stages; requirements part of chain success |
| `packages/runtime`          | COMPLETE                                      | Mock response execution including identity containment                        |
| `packages/test-runner`      | COMPLETE                                      | Workspace-scoped `expect rule … to_match`                                     |
| `packages/language-service` | PARTIAL                                       | Thin analyze facade                                                           |
| `packages/exporters`        | NOT STARTED                                   | Scaffold only                                                                 |

## Example status

| Example               | Status   | Notes                                      |
| --------------------- | -------- | ------------------------------------------ |
| exploit-to-ransomware | COMPLETE | Full fixture + integration coverage        |
| account-takeover      | COMPLETE | Positive + negative fixtures + integration |
| data-exfiltration     | COMPLETE | Positive + negative fixtures + integration |

## Verification status

| Check                    | Status   | Last run   | Notes                                                         |
| ------------------------ | -------- | ---------- | ------------------------------------------------------------- |
| Dependency installation  | COMPLETE | 2026-08-11 | `pnpm install`                                                |
| Formatting               | COMPLETE | 2026-08-11 | `pnpm format:check`                                           |
| Linting                  | COMPLETE | 2026-08-11 | `pnpm lint`                                                   |
| Type checking            | COMPLETE | 2026-08-11 | `pnpm check`                                                  |
| Unit + integration tests | COMPLETE | 2026-08-11 | **114** tests passed (14 files); 0 failed                     |
| Production build         | COMPLETE | 2026-08-11 | Package tsc + playground Vite build                           |
| Example runner           | COMPLETE | 2026-08-11 | ransomware, account-takeover, and data-exfiltration all MATCH |
| Playground launch        | PARTIAL  | 2026-08-11 | Build verified; interactive `pnpm dev` not smoke-tested in CI |

## Known limitations

- Exporters are not implemented.
- No LSP / VS Code extension / vendor adapters.
- Soft keywords may appear in identifier positions.
- The AegisScript name may change later.
- No backwards-compatibility guarantee while experimental.
- Interpreter matching is complete for hackathon/demo semantics, not production SIEM-scale workloads.
- Final demo packaging (video / Devpost copy) remains.

## Language design consideration

`approval required for terminate_process;` is ambiguous: it can be read as either “this action requires approval” (gate) or “request this action pending approval” (proposal). The current runtime treats it as proposing a pending approval-gated action. Grammar redesign is deferred.

`disable account` is always pending in the mock runtime (high-impact identity action), which is intentional for the demo safety model.

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

### ADR-001 through ADR-014

Prior ADRs remain accepted (TypeScript, hand-written parser, simulation-first runtime, package boundaries, product naming, soft keywords, source exports, min-chain confidence, telemetry gating, chronological multi-stage matching, observe/then backtracking, workspace-scoped tests, separated playground operations).

### ADR-015: Reusable identity containment actions

**Status:** Accepted

Account-takeover needs identity response concepts beyond endpoint isolation. The language adds:

- `revoke sessions user <asset>;` — simulated immediately
- `disable account <asset>;` — always pending approval
- `reenable account <asset>;` — rollback metadata only

These are reusable identity primitives, not scenario-specific hacks. Session revocation has no rollback because revoked sessions cannot be restored.

## Technical debt

### TD-001: Package exports point at TypeScript sources

- Status: Open
- Introduced: 2026-08-06

### TD-002: Exporters remain scaffolds

- Status: Open
- Introduced: 2026-08-06
- Updated: 2026-08-11 — deferred behind demo packaging

### TD-003: Playground uses a plain textarea

- Status: Open
- Introduced: 2026-08-06
- Updated: 2026-08-11 — acceptable for demo; richer editor optional

### TD-004: Approval statement semantics are ambiguous

- Status: Open
- Introduced: 2026-08-11
- Affected area: grammar / respond blocks / runtime interpretation
- Reason: current syntax conflates gate declaration and action proposal
- Consequence: demo narrative must carefully explain pending approval behaviour
- Recommended resolution: dedicated language-design pass after demo packaging

## Change log

### 2026-08-11 (multi-scenario demo expansion — uncommitted)

- Added account-takeover and data-exfiltration end-to-end examples with negative fixtures.
- Added identity response/rollback actions across AST → parser → checker → interpreter → runtime.
- Playground scenario switcher plus detection summary, event chain, and response plan panels.
- README repositioned around three domains and simulation-only safety.
- Verification: 114 tests; all three example runners MATCH.

### 2026-08-11 (then-stage chain-search — committed as `55e3f33`)

- Interpreter searches then-stage candidates with recursive backtracking.
- Requirement failures continue the search; responses emit only for successful chains.

### 2026-08-11 (correctness fix pass — committed as `3831e62`)

- Observe-candidate backtracking, workspace-scoped rule IDs, separated playground operations.

### 2026-08-11 (semantics hardening)

- Ordered multi-stage matching, telemetry gating, min confidence, event validation, test-runner.

### 2026-08-06

- Initial monorepo, vertical slice, ransomware example, playground scaffold.

---

## Maintenance instructions

Update this document whenever implementation status, roadmap, limitations, verification, or architectural decisions change. Never mark work complete based only on files or interfaces existing.
