# AegisScript Project Status

> AegisScript is currently an experimental defensive cybersecurity DSL. It is not ready to execute actions against real systems.

## Status metadata

| Field                | Value                                    |
| -------------------- | ---------------------------------------- |
| Project              | AegisScript                              |
| Current phase        | Phase 6 — Browser playground             |
| Overall status       | PARTIAL                                  |
| Last updated         | 2026-08-06                               |
| Last verified commit | Not recorded                             |
| Maintainer           | Project team                             |
| Current milestone    | First end-to-end language vertical slice |

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

AegisScript now has a working vertical slice: policies can be lexed, parsed, checked, and evaluated against mock events. Simulated response actions are recorded through `MockResponseExecutor`. The exploit-to-ransomware example and browser playground demonstrate the pipeline end to end.

No real security-system integrations are permitted. All response actions remain simulated.

## Phase roadmap

| Phase   | Scope                                             | Status      | Completion criteria                                                                                                        |
| ------- | ------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------- |
| Phase 0 | Repository and workspace initialization           | COMPLETE    | Workspace installs successfully and root development commands are configured.                                              |
| Phase 1 | Source model, diagnostics, AST, lexer, and parser | COMPLETE    | Supported example parses into a typed AST with useful diagnostics and passing tests.                                       |
| Phase 2 | Name resolution and semantic checker              | COMPLETE    | Initial semantic rules are validated with passing tests.                                                                   |
| Phase 3 | Mock event interpreter                            | COMPLETE    | Rules can be evaluated against deterministic mock event sequences.                                                         |
| Phase 4 | Safe response runtime                             | COMPLETE    | Proposed actions are recorded through a mock executor with approval and rollback metadata.                                 |
| Phase 5 | Test runner and complete example                  | PARTIAL     | The exploit-to-ransomware example passes an end-to-end integration test; dedicated test-runner package remains scaffolded. |
| Phase 6 | Browser playground                                | COMPLETE    | Source, diagnostics, AST, events, execution trace, and simulated responses are visible in the UI.                          |
| Phase 7 | Language-service foundation                       | PARTIAL     | `analyzeSource` wraps parse+check; full LSP is not implemented.                                                            |
| Phase 8 | Exporters                                         | NOT STARTED | At least one documented, deterministic export format is implemented.                                                       |
| Phase 9 | Production adapters                               | DEFERRED    | Requires a separate security and architecture review.                                                                      |

## Implemented

### Working end-to-end slice

- Shared source ranges and diagnostics (`@aegisscript/ast`)
- Product naming constants centralized in `@aegisscript/ast` (`PRODUCT_NAME`, `PRODUCT_ID`, `FILE_EXTENSION`)
- Lexer with keywords, literals, durations, comments, and lexical diagnostics
- Typed AST for the initial grammar
- Recursive-descent parser with recovery and diagnostics
- Semantic checker for duplicates, unknown refs, confidence/duration rules, respond/rollback structure
- Interpreter matching observe/then/`within`, confidence, and sources
- Mock response runtime with audit log, pending approvals, and recorded rollbacks
- Fully working `examples/exploit-to-ransomware`
- Browser playground wired to workspace packages
- Integration test comparing normalized simulation output to `expected-result.json`

## In progress

Nothing is actively mid-implementation after this initialization session.

## Next recommended task

Implement `@aegisscript/test-runner` so `test` declarations in policies are executed against fixtures and report pass/fail without relying only on the integration harness.

The next developer should:

1. Design a narrow API that accepts a checked program plus events.
2. Evaluate `expect rule <name> to_match` statements against interpreter results.
3. Add unit tests for passing and failing expectations.
4. Optionally wire a playground “Run Tests” action.
5. Update this file when the package moves from scaffold to `PARTIAL`/`COMPLETE`.

## Planned language features

| Feature                | Status      | Notes                                               |
| ---------------------- | ----------- | --------------------------------------------------- |
| Workspace declarations | COMPLETE    | Required by the first parser milestone.             |
| Asset declarations     | COMPLETE    | Named endpoint assets supported.                    |
| Telemetry declarations | COMPLETE    | Declarative mock sources; required per workspace.   |
| Rule declarations      | COMPLETE    | Required by the first vertical slice.               |
| Observe stage          | COMPLETE    | Initial event-matching stage.                       |
| Then stage             | COMPLETE    | Ordered multi-stage behaviour.                      |
| Temporal windows       | COMPLETE    | Units: seconds, minutes, and hours.                 |
| Conditions             | COMPLETE    | Basic comparisons and Boolean operators.            |
| Evidence requirements  | COMPLETE    | Confidence and source-count thresholds.             |
| Response blocks        | COMPLETE    | Simulation only.                                    |
| Approval gates         | COMPLETE    | Approval-gated actions remain pending.              |
| Rollback blocks        | COMPLETE    | Recorded but not executed against real systems.     |
| Replay tests           | PARTIAL     | Declarations parse/check; dedicated runner pending. |
| Protected resources    | NOT STARTED | Design required before implementation.              |
| Live event streams     | DEFERRED    | Not part of the initial milestone.                  |
| Vendor integrations    | DEFERRED    | Requires separate adapter and security design.      |

## Package status

| Package or application      | Status      | Current responsibility                                    |
| --------------------------- | ----------- | --------------------------------------------------------- |
| `apps/playground`           | COMPLETE    | Browser-based editor and simulator for the initial slice. |
| `packages/lexer`            | COMPLETE    | Tokenization and lexical diagnostics.                     |
| `packages/ast`              | COMPLETE    | Typed syntax-tree definitions and shared diagnostics.     |
| `packages/parser`           | COMPLETE    | Recursive-descent parsing.                                |
| `packages/checker`          | COMPLETE    | Name resolution and semantic validation.                  |
| `packages/interpreter`      | COMPLETE    | Evaluation of checked rules against mock events.          |
| `packages/runtime`          | COMPLETE    | Safe mock response execution and audit records.           |
| `packages/test-runner`      | NOT STARTED | Scaffold only; throws until implemented.                  |
| `packages/language-service` | PARTIAL     | `analyzeSource` facade over parse+check.                  |
| `packages/exporters`        | NOT STARTED | Scaffold only; throws until implemented.                  |

## Verification status

| Check                   | Status   | Last run   | Notes                                                         |
| ----------------------- | -------- | ---------- | ------------------------------------------------------------- |
| Dependency installation | COMPLETE | 2026-08-06 | `pnpm install` succeeded                                      |
| Formatting              | COMPLETE | 2026-08-06 | `pnpm format:check` passed                                    |
| Linting                 | COMPLETE | 2026-08-06 | `pnpm lint` passed                                            |
| Type checking           | COMPLETE | 2026-08-06 | `pnpm check` passed                                           |
| Unit tests              | COMPLETE | 2026-08-06 | Package Vitest suites passed                                  |
| Integration tests       | COMPLETE | 2026-08-06 | Ransomware example integration passed                         |
| Production build        | COMPLETE | 2026-08-06 | Package tsc + playground Vite build passed                    |
| Playground launch       | PARTIAL  | 2026-08-06 | Build verified; interactive `pnpm dev` not smoke-tested in CI |

## Known limitations

- The language grammar is intentionally small and may change.
- Confidence is mock-derived (max of event confidences), not ML-scored.
- Source counting uses distinct event `source` strings only.
- `test` blocks are validated but not executed by a dedicated runner.
- Exporters are not implemented.
- No LSP, VS Code extension, or vendor adapters.
- No live event streams or persistent storage.
- Keywords may also be used as identifiers in name positions (soft-keyword behaviour).
- The AegisScript name may change later.
- No backwards-compatibility guarantee while experimental.

## Safety constraints

The following constraints apply to all current development:

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

### ADR-001: TypeScript implementation

**Status:** Accepted

AegisScript will initially be implemented in TypeScript to support rapid compiler development, shared types across the compiler and browser playground, and straightforward hackathon demonstrations.

### ADR-002: Hand-written parser

**Status:** Accepted

The initial parser will use recursive descent. The first grammar is intentionally small, and direct implementation will make parsing behaviour and diagnostics easier to demonstrate.

### ADR-003: Simulation-first runtime

**Status:** Accepted

The initial runtime will use a mock response executor. No real containment or remediation action will be performed.

### ADR-004: Monorepo package boundaries

**Status:** Accepted

Compiler stages, runtime behaviour, editor services, and exporters will remain in separate workspace packages. Higher-level packages may depend on lower-level packages, but lower-level packages must not import higher-level packages.

### ADR-005: Temporary product name

**Status:** Accepted

The working language name is AegisScript. Naming should be centralized where practical because the project may be renamed later.

### ADR-006: Soft keywords as identifiers

**Status:** Accepted

Keywords such as `endpoint` may appear in identifier positions (for example `asset endpoint finance_laptop`). The parser accepts keyword tokens where identifiers are required.

### ADR-007: Source exports for workspace packages

**Status:** Accepted

Package `exports` currently point at TypeScript sources for Vitest/Vite/tsx ergonomics during the initial slice. Compiled `dist` output is still produced by `pnpm build`.

## Technical debt

### TD-001: Package exports point at TypeScript sources

- Status: Open
- Introduced: 2026-08-06
- Affected area: all workspace packages
- Reason: simplify Vite/Vitest consumption without dual publish conditions
- Consequence: consumers must transpile TypeScript; less like a published npm layout
- Recommended resolution: dual `development`/`import` export conditions once packaging stabilizes

### TD-002: Test-runner and exporters are scaffolds

- Status: Open
- Introduced: 2026-08-06
- Affected area: `packages/test-runner`, `packages/exporters`
- Reason: vertical slice prioritized interpreter + example integration tests
- Consequence: policy `test` blocks and documentation export are incomplete
- Recommended resolution: implement test-runner next, then one markdown/JSON exporter

### TD-003: Playground uses a plain textarea

- Status: Open
- Introduced: 2026-08-06
- Affected area: `apps/playground`
- Reason: avoid Monaco weight for the first UI
- Consequence: no syntax highlighting or inline diagnostics decorations
- Recommended resolution: revisit after language-service APIs mature

## Decisions still required

- Final grammar for telemetry references inside rules
- Whether response actions gain function-call syntax later
- How confidence is calculated beyond mock input
- Exact semantics of evidence source counting for multi-workspace policies
- Protected-resource syntax
- Export format priorities
- Scope of the first language-service / LSP implementation

## Change log

### 2026-08-06

- Initialized the pnpm monorepo, tooling, CI, docs, and package layout.
- Implemented AST, lexer, parser, checker, interpreter, and mock runtime.
- Added the exploit-to-ransomware example with integration coverage.
- Added the browser playground.
- Scaffolded test-runner and exporters with explicit non-implementation errors.
- Marked Phases 0–4 and 6 complete for the initial vertical-slice scope.
- Marked Phase 5 and Phase 7 partial.
- Set next recommended task to implement `@aegisscript/test-runner`.

### YYYY-MM-DD

- Created the initial project-status document.
- Set the overall project status to `IN PROGRESS`.
- Defined the initial phased roadmap.
- Recorded the simulation-only safety boundary.
- Identified the first recommended implementation task.

---

## Maintenance instructions

Update this document whenever:

- A feature begins implementation.
- A feature becomes blocked.
- A feature becomes partially usable.
- A feature reaches its documented completion criteria.
- A meaningful test or build status changes.
- A limitation or technical debt item is discovered.
- An architectural decision is made or reversed.
- The recommended next task changes.

Never mark work complete based only on the presence of files, types, interfaces, comments, or placeholder functions.
