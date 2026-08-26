# Bitpall Project Status

> Bitpall is an experimental defensive cybersecurity DSL. Response actions are simulation-only and must not target real systems.

## Status metadata

| Field             | Value                                                                           |
| ----------------- | ------------------------------------------------------------------------------- |
| Project           | Bitpall (Behavioral Intelligence & Threat Protection Automation Logic Language) |
| Current phase     | Hackathon scope complete — manual playground QA / submission packaging next     |
| Overall status    | COMPLETE for intended hackathon scope                                           |
| Last updated      | 2026-08-26                                                                      |
| Maintainer        | Project team                                                                    |
| Current milestone | Manual QA + Devpost/submission packaging                                        |

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

Bitpall expresses declarative multi-stage detection and simulated response across three cybersecurity demos: exploit-to-ransomware, account takeover, and data exfiltration. The interpreter performs deterministic ordered event-chain search with backtracking and structured match/requirement explanations. The playground presents Detection → Event Chain → Response, with Advanced AST/trace details and Markdown report export via `@bitpall/exporters`.

## Phase roadmap

| Phase    | Scope                                             | Status   | Completion criteria                                                                         |
| -------- | ------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------- |
| Phase 0  | Repository and workspace initialization           | COMPLETE | Workspace installs successfully and root development commands are configured.               |
| Phase 1  | Source model, diagnostics, AST, lexer, and parser | COMPLETE | Supported example parses into a typed AST with useful diagnostics and passing tests.        |
| Phase 2  | Name resolution and semantic checker              | COMPLETE | Semantic rules validated, including cross-kind duplicates and telemetry checks.             |
| Phase 3  | Mock event interpreter                            | COMPLETE | Ordered chain search with observe + then backtracking; structured explanations.             |
| Phase 4  | Safe response runtime                             | COMPLETE | Mock executor with approval and rollback metadata, including identity actions.              |
| Phase 5  | Test runner and ransomware example                | COMPLETE | Workspace-scoped expectations; ransomware example integration covers the full pipeline.     |
| Phase 6  | Browser playground                                | COMPLETE | Scenario switcher; Detection / Event chain / Response; Advanced AST/trace; Markdown export. |
| Phase 7  | Language-service foundation                       | PARTIAL  | `analyzeSource` wraps parse+check; full LSP is not implemented.                             |
| Phase 8  | Additional demo examples                          | COMPLETE | Account-takeover and data-exfiltration examples with fixtures and tests.                    |
| Phase 9  | Exporters                                         | COMPLETE | Deterministic Markdown detection-report exporter + playground download.                     |
| Phase 10 | Production adapters                               | DEFERRED | Requires a separate security and architecture review.                                       |

## Implemented

- Lexer, parser, AST, checker, interpreter, mock runtime, test-runner
- Ordered multi-stage temporal matching with deterministic chain-search backtracking
- Structured condition and requirement explanations (interpreter → playground)
- Identity responses: `revoke sessions` / `disable account` / `reenable account`
- Endpoint responses: isolate / preserve / terminate (approval) / reconnect
- Three end-to-end examples with positive and negative fixtures
- Playground scenario selector, explainable result panels, Advanced section
- Deterministic Markdown security-report export (`@bitpall/exporters`)

## Next recommended task

**Manual playground QA and hackathon submission packaging** (copy, optional demo video).

Deferred engineering (out of hackathon scope):

1. Full LSP / VS Code extension
2. Production security-product adapters
3. Additional export formats (JSON/PDF/etc.)

## Package status

| Package or application      | Status                                        | Notes                                                            |
| --------------------------- | --------------------------------------------- | ---------------------------------------------------------------- |
| `apps/playground`           | COMPLETE for demo scope                       | Scenario switcher; Detection / chain / response; Markdown export |
| `packages/lexer`            | COMPLETE                                      | Tokenization and lexical diagnostics                             |
| `packages/ast`              | COMPLETE                                      | Typed AST, diagnostics (`BITPALL####`), product naming           |
| `packages/parser`           | COMPLETE                                      | Recursive-descent parsing                                        |
| `packages/checker`          | COMPLETE                                      | Semantic validation                                              |
| `packages/interpreter`      | COMPLETE for current hackathon/demo semantics | Chain search; requirements; structured explanations              |
| `packages/runtime`          | COMPLETE                                      | Mock response execution including identity containment           |
| `packages/test-runner`      | COMPLETE                                      | Workspace-scoped `expect rule … to_match`                        |
| `packages/language-service` | PARTIAL                                       | Thin analyze facade                                              |
| `packages/exporters`        | COMPLETE for Markdown                         | Deterministic Markdown detection reports                         |

## Example status

| Example               | Status   | Notes                                      |
| --------------------- | -------- | ------------------------------------------ |
| exploit-to-ransomware | COMPLETE | Full fixture + negatives + integration     |
| account-takeover      | COMPLETE | Positive + negative fixtures + integration |
| data-exfiltration     | COMPLETE | Positive + negative fixtures + integration |

## Verification status

| Check                | Status                | Notes                                                                |
| -------------------- | --------------------- | -------------------------------------------------------------------- |
| Automated validation | COMPLETE (2026-08-26) | format/lint/check/test(**132**)/build/verify + all three examples    |
| Manual playground QA | REMAINING             | Human browser pass still required before submission                  |
| Production readiness | NOT CLAIMED           | Simulation-only prototype                                            |

## Known limitations

- Responses are simulated only — no live EDR/IAM/network mutation.
- No full LSP / VS Code extension / vendor adapters.
- Exporter currently supports Markdown only (not JSON/PDF/HTML).
- Soft keywords may appear in identifier positions.
- Diagnostic codes use the `BITPALL` prefix (for example `BITPALL1001`).
- No backwards-compatibility guarantee while experimental.
- Interpreter matching is complete for hackathon/demo semantics, not production SIEM-scale workloads.

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
- Exported reports must not claim live infrastructure changes.

## Current blockers

No blockers have been recorded.

## Architectural decisions

### ADR-001 through ADR-015

Prior ADRs remain accepted (TypeScript, hand-written parser, simulation-first runtime, package boundaries, product naming, soft keywords, source exports, min-chain confidence, telemetry gating, chronological multi-stage matching, observe/then backtracking, workspace-scoped tests, separated playground operations, reusable identity containment actions).

### ADR-016: Markdown exporter as presentation layer

**Status:** Accepted

`@bitpall/exporters` renders structured `ProgramNode` + `InterpretResult` (+ optional events) into deterministic Markdown. It must not re-implement detection evaluation. Browser download UX lives in the playground only.

## Technical debt

### TD-001: Package exports point at TypeScript sources

- Status: Open
- Introduced: 2026-08-06

### TD-002: Exporters remain scaffolds

- Status: **Resolved** (2026-08-26) — Markdown exporter implemented
- Introduced: 2026-08-06

### TD-003: Playground uses a plain textarea

- Status: Open
- Introduced: 2026-08-06
- Updated: 2026-08-26 — acceptable for demo; richer editor optional

### TD-004: Approval statement semantics are ambiguous

- Status: Open
- Introduced: 2026-08-11
- Affected area: grammar / respond blocks / runtime interpretation
- Reason: current syntax conflates gate declaration and action proposal
- Consequence: demo narrative must carefully explain pending approval behaviour
- Recommended resolution: dedicated language-design pass after submission

## Change log

### 2026-08-26 (Markdown exporter + final polish)

- Implemented deterministic Markdown detection-report exporter.
- Wired **Export Markdown** into the playground.
- Expanded workspace verification to all first-party packages.
- Updated README / package docs / project status for exporter completion.

### 2026-08-11 (multi-scenario + explainability)

- Account-takeover and data-exfiltration examples; identity responses; playground explainability panels.

### 2026-08-11 (then-stage chain-search)

- Interpreter searches then-stage candidates with recursive backtracking.

### 2026-08-06

- Initial monorepo, vertical slice, ransomware example, playground scaffold.

---

## Maintenance instructions

Update this document whenever implementation status, roadmap, limitations, verification, or architectural decisions change. Never mark work complete based only on files or interfaces existing.
