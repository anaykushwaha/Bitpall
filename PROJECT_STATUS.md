# AegisScript Project Status

> AegisScript is currently an experimental defensive cybersecurity DSL. It is not ready to execute actions against real systems.

## Status metadata

| Field                | Value                                        |
| -------------------- | -------------------------------------------- |
| Project              | AegisScript                                  |
| Current phase        | Phase 5 — Test runner and complete example   |
| Overall status       | PARTIAL                                      |
| Last updated         | 2026-08-11                                   |
| Last verified commit | 14fe1532de2c8141d6ad94e0ae6c009715b7c9e0     |
| Maintainer           | Project team                                 |
| Current milestone    | Semantics hardening + test-runner completion |

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

AegisScript has a hardened vertical slice: ordered multi-stage matching, telemetry-aware evidence, minimum-chain confidence, validated mock events, and an implemented `@aegisscript/test-runner` that executes `expect rule … to_match`. Responses remain simulation-only.

## Phase roadmap

| Phase   | Scope                                             | Status      | Completion criteria                                                                                           |
| ------- | ------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------- |
| Phase 0 | Repository and workspace initialization           | COMPLETE    | Workspace installs successfully and root development commands are configured.                                 |
| Phase 1 | Source model, diagnostics, AST, lexer, and parser | COMPLETE    | Supported example parses into a typed AST with useful diagnostics and passing tests.                          |
| Phase 2 | Name resolution and semantic checker              | COMPLETE    | Initial semantic rules are validated with passing tests; cross-kind duplicates and telemetry checks included. |
| Phase 3 | Mock event interpreter                            | COMPLETE    | Ordered multi-stage evaluation, confidence, telemetry filtering, and event validation are covered by tests.   |
| Phase 4 | Safe response runtime                             | COMPLETE    | Proposed actions are recorded through a mock executor with approval and rollback metadata.                    |
| Phase 5 | Test runner and complete example                  | COMPLETE    | `@aegisscript/test-runner` executes expectations; ransomware example integration covers the full pipeline.    |
| Phase 6 | Browser playground                                | COMPLETE    | Source, diagnostics, AST, events, trace, responses, and test results are visible in the UI.                   |
| Phase 7 | Language-service foundation                       | PARTIAL     | `analyzeSource` wraps parse+check; full LSP is not implemented.                                               |
| Phase 8 | Exporters                                         | NOT STARTED | At least one documented, deterministic export format is implemented.                                          |
| Phase 9 | Production adapters                               | DEFERRED    | Requires a separate security and architecture review.                                                         |

## Implemented

### Working end-to-end slice

- Shared source ranges and diagnostics (`@aegisscript/ast`)
- Product naming constants centralized in `@aegisscript/ast`
- Lexer, parser, checker, interpreter, mock runtime
- Ordered multi-stage temporal matching (`within` from observe; chronological stage order required)
- Mock event validation (`validateMockEvents`)
- Chain confidence = minimum explicit confidence; missing confidence treated as `0`
- Telemetry `source` strings gate stage matching and `require sources`
- Cross-kind duplicate declaration detection with correct original ranges
- Duplicate observe/respond/rollback diagnostics
- Integer `sources` thresholds; telemetry source property validation
- `@aegisscript/test-runner` for `expect rule … to_match`
- Exploit-to-ransomware example + integration coverage through test-runner
- Playground Check / Run Simulation / Run Tests actions

## In progress

Nothing is mid-implementation after this session.

## Next recommended task

Implement the first deterministic exporter in `@aegisscript/exporters` (for example Markdown documentation of workspace assets, rules, requirements, and simulated response plans). Keep exporters read-only and simulation-oriented.

The next developer should:

1. Design one export format and a narrow API.
2. Cover the ransomware example with a golden output fixture.
3. Document the format in `docs/` and mark Phase 8 accordingly.
4. Avoid vendor-specific detection rule generation until a dedicated design review.

## Planned language features

| Feature                | Status      | Notes                                                        |
| ---------------------- | ----------- | ------------------------------------------------------------ |
| Workspace declarations | COMPLETE    | Required by the first parser milestone.                      |
| Asset declarations     | COMPLETE    | Named endpoint assets supported.                             |
| Telemetry declarations | COMPLETE    | Declared `source` strings gate matching and evidence counts. |
| Rule declarations      | COMPLETE    | Required by the first vertical slice.                        |
| Observe stage          | COMPLETE    | Initial event-matching stage.                                |
| Then stage             | COMPLETE    | Ordered multi-stage behaviour.                               |
| Temporal windows       | COMPLETE    | `within` from observe; stages must remain chronological.     |
| Conditions             | COMPLETE    | Basic comparisons and Boolean operators.                     |
| Evidence requirements  | COMPLETE    | Min confidence + distinct declared sources.                  |
| Response blocks        | COMPLETE    | Simulation only.                                             |
| Approval gates         | COMPLETE    | Approval-gated actions remain pending.                       |
| Rollback blocks        | COMPLETE    | Recorded but not executed against real systems.              |
| Replay tests           | COMPLETE    | `test-runner` executes `expect rule … to_match`.             |
| Protected resources    | NOT STARTED | Design required before implementation.                       |
| Live event streams     | DEFERRED    | Not part of the initial milestone.                           |
| Vendor integrations    | DEFERRED    | Requires separate adapter and security design.               |

## Package status

| Package or application      | Status      | Current responsibility                                    |
| --------------------------- | ----------- | --------------------------------------------------------- |
| `apps/playground`           | COMPLETE    | Browser editor/simulator with Run Tests                   |
| `packages/lexer`            | COMPLETE    | Tokenization and lexical diagnostics                      |
| `packages/ast`              | COMPLETE    | Typed AST, diagnostics, product naming                    |
| `packages/parser`           | COMPLETE    | Recursive-descent parsing + duplicate section diagnostics |
| `packages/checker`          | COMPLETE    | Semantic validation including telemetry/source rules      |
| `packages/interpreter`      | COMPLETE    | Ordered matching, confidence, telemetry, event validation |
| `packages/runtime`          | COMPLETE    | Mock response execution and audit records                 |
| `packages/test-runner`      | COMPLETE    | Executes `expect rule … to_match`                         |
| `packages/language-service` | PARTIAL     | `analyzeSource` facade over parse+check                   |
| `packages/exporters`        | NOT STARTED | Scaffold only; throws until implemented                   |

## Verification status

| Check                   | Status   | Last run   | Notes                                                         |
| ----------------------- | -------- | ---------- | ------------------------------------------------------------- |
| Dependency installation | COMPLETE | 2026-08-11 | `pnpm install` succeeded                                      |
| Formatting              | COMPLETE | 2026-08-11 | `pnpm format:check` passed                                    |
| Linting                 | COMPLETE | 2026-08-11 | `pnpm lint` passed                                            |
| Type checking           | COMPLETE | 2026-08-11 | `pnpm check` passed                                           |
| Unit tests              | COMPLETE | 2026-08-11 | 83 tests passed                                               |
| Integration tests       | COMPLETE | 2026-08-11 | Ransomware pipeline including test-runner passed              |
| Production build        | COMPLETE | 2026-08-11 | Package tsc + playground Vite build passed                    |
| Example runner          | COMPLETE | 2026-08-11 | `pnpm example:ransomware` passed                              |
| Playground launch       | PARTIAL  | 2026-08-11 | Build verified; interactive `pnpm dev` not smoke-tested in CI |

## Known limitations

- Grammar remains intentionally small and may change.
- Confidence is mock-derived (minimum of event confidences), not ML-scored.
- Source counting uses distinct declared telemetry `source` strings only.
- Events without a declared telemetry source cannot satisfy detection stages.
- Exporters are not implemented.
- No LSP, VS Code extension, or vendor adapters.
- No live event streams or persistent storage.
- Soft keywords may appear in identifier positions.
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

### ADR-002: Hand-written parser

**Status:** Accepted

### ADR-003: Simulation-first runtime

**Status:** Accepted

### ADR-004: Monorepo package boundaries

**Status:** Accepted

### ADR-005: Temporary product name

**Status:** Accepted

### ADR-006: Soft keywords as identifiers

**Status:** Accepted

### ADR-007: Source exports for workspace packages

**Status:** Accepted

### ADR-008: Minimum-chain confidence

**Status:** Accepted

Chain confidence is the minimum explicit confidence among matched events. Missing confidence is treated as `0`.

### ADR-009: Telemetry-gated event eligibility

**Status:** Accepted

Undeclared-source events remain in the input stream but cannot satisfy observe/then stages and do not count toward `require sources`.

### ADR-010: Chronological multi-stage matching

**Status:** Accepted

`within` is measured from observe time, and each subsequent stage must occur at or after the previous matched stage. Equal timestamps break ties by original input order.

## Technical debt

### TD-001: Package exports point at TypeScript sources

- Status: Open
- Introduced: 2026-08-06
- Affected area: all workspace packages
- Reason: simplify Vite/Vitest consumption without dual publish conditions
- Consequence: consumers must transpile TypeScript; less like a published npm layout
- Recommended resolution: dual `development`/`import` export conditions once packaging stabilizes

### TD-002: Exporters remain scaffolds

- Status: Open
- Introduced: 2026-08-06
- Updated: 2026-08-11
- Affected area: `packages/exporters`
- Reason: semantics and test-runner prioritized over export formats
- Consequence: documentation export is incomplete
- Recommended resolution: implement one Markdown or JSON exporter next

### TD-003: Playground uses a plain textarea

- Status: Open
- Introduced: 2026-08-06
- Affected area: `apps/playground`
- Reason: avoid Monaco weight for the first UI
- Consequence: no syntax highlighting or inline diagnostics decorations
- Recommended resolution: revisit after language-service APIs mature

## Decisions still required

- Protected-resource syntax
- Export format priorities
- Scope of the first language-service / LSP implementation
- Whether confidence models beyond min-chain are needed later

## Change log

### 2026-08-11

- Fixed ordered multi-stage temporal matching and stable equal-timestamp ordering.
- Hardened checker: workspace original ranges, cross-kind duplicates, telemetry source validation, integer sources thresholds.
- Added parser diagnostics for duplicate observe/respond/rollback sections.
- Added `validateMockEvents` and wired playground/example/integration to it.
- Changed confidence to minimum-chain semantics with missing confidence = 0.
- Connected telemetry declarations to event source eligibility.
- Implemented `@aegisscript/test-runner` with unit and integration coverage.
- Added playground Run Tests panel and `.gitattributes` LF normalization.
- Marked Phase 5 complete for the initial test-runner scope.
- Set next recommended task to implement exporters.

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
