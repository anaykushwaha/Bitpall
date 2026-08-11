# AegisScript

AegisScript is an experimental defensive cybersecurity domain-specific language. Security teams can describe suspicious behaviour, required evidence, temporal relationships, confidence thresholds, and safe containment responses in one readable policy.

> **Safety:** AegisScript does not execute real security actions in this repository. All response actions are simulated through a mock executor. Real EDR, SIEM, identity, and network integrations are not implemented.

## Problem

Detection content and response playbooks are often split across vendor consoles, ticket templates, and ad-hoc scripts. That makes it hard to:

- express multi-stage attack sequences with explicit timing
- require evidence before acting
- keep approval gates and rollback steps next to the detection logic
- replay deterministic security tests

A small DSL keeps those concerns together and reviewable.

## Current maturity

This repository contains an end-to-end vertical slice:

1. Lex
2. Parse
3. Semantic check
4. Validate mock events
5. Interpret against mock events
6. Execute policy `test` expectations
7. Record simulated responses
8. Inspect results in a browser playground

See [PROJECT_STATUS.md](./PROJECT_STATUS.md) for exact completion status. Do not assume unimplemented packages are production-ready.

## Monorepo overview

| Path                        | Role                                                  |
| --------------------------- | ----------------------------------------------------- |
| `packages/lexer`            | Tokenization                                          |
| `packages/ast`              | Typed AST, source ranges, diagnostics, product naming |
| `packages/parser`           | Recursive-descent parser                              |
| `packages/checker`          | Semantic validation                                   |
| `packages/interpreter`      | Mock-event rule evaluation                            |
| `packages/runtime`          | Mock response executor and audit log                  |
| `packages/language-service` | Thin analyze API for editors/UI                       |
| `packages/test-runner`      | Replay `test` / `expect rule … to_match`              |
| `packages/exporters`        | Scaffold only                                         |
| `apps/playground`           | Browser editor and simulator                          |
| `examples/`                 | Working and planned scenarios                         |

## Installation

Requires Node.js 20+ and pnpm 9+.

```bash
pnpm install
```

## Development commands

```bash
pnpm check              # Typecheck all packages
pnpm test               # Unit + integration tests
pnpm lint               # ESLint
pnpm format             # Prettier write
pnpm format:check       # Prettier check
pnpm build              # Build packages and playground
pnpm dev                # Start playground
pnpm example:ransomware # Run the ransomware example
pnpm verify             # Verify required workspace files exist
```

## Run the ransomware example

```bash
pnpm example:ransomware
```

## Open the playground

```bash
pnpm dev
```

Then open the local Vite URL (default `http://localhost:5173`).

## Documentation

- [Overview](./docs/overview.md)
- [Getting started](./docs/getting-started.md)
- [Architecture](./docs/architecture.md)
- [Grammar](./docs/grammar.md)
- [Language reference](./docs/language-reference.md)
- [Runtime model](./docs/runtime-model.md)
- [Safety model](./docs/safety-model.md)
- [Type system notes](./docs/type-system.md)
- [Project status](./PROJECT_STATUS.md)

## License

See [LICENSE](./LICENSE).
