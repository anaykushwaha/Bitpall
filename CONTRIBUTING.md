# Contributing

This repository implements **Bitpall**, a defensive cybersecurity DSL.

## Development setup

1. Install Node.js 20+.
2. Install pnpm 9+.
3. Run `pnpm install` from the repository root.
4. Run `pnpm check`, `pnpm test`, and `pnpm lint` before opening a pull request.

## Coding standards

- Keep TypeScript strict. Do not introduce `any`.
- Prefer explicit result types at package boundaries.
- Keep compiler stages separated: lexer, parser, checker, interpreter, runtime.
- Lower-level packages must not import higher-level packages.
- Do not implement or invoke real destructive security actions.
- Update documentation when behaviour changes.

## Project status updates

Contributors must update `PROJECT_STATUS.md` when a change affects:

- implementation status
- roadmap phase status
- known limitations
- technical debt
- architectural decisions
- verification results

Use only the allowed status labels defined in that file. Never mark a feature `COMPLETE` unless implementation, tests, and relevant documentation are finished.

## Pull requests

- Keep changes focused.
- Include or update tests for behavioural changes.
- Mention safety impact if response or runtime behaviour changes.
- Link related status or roadmap updates.
