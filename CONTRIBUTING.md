# Contributing to Bitpall

Thank you for your interest in contributing to **Bitpall**.

Bitpall is a **defensive cybersecurity domain-specific language (DSL)** designed to express security detection logic, event relationships, confidence requirements, telemetry requirements, and safe response workflows in a clear, structured syntax.

This document explains how to set up the project, maintain its architecture, validate changes, and contribute safely.

---

## Development Setup

### Prerequisites

Before contributing, make sure you have:

- **Node.js 20 or later**
- **pnpm 9 or later**
- **Git**
- A code editor with TypeScript support (VS Code is recommended)

### Getting the Repository

Clone the repository and enter the project directory:

```bash
git clone <repository-url>
cd bitpall
```

Install all workspace dependencies:

```bash
pnpm install
```

### Running the Playground

The Bitpall playground is the primary interactive demonstration environment.

Start it with:

```bash
pnpm dev
```

The command starts the playground development server. Open the local URL displayed in the terminal.

---

## Project Structure

Bitpall is organized as a multi-package workspace. The major compiler and execution stages are intentionally separated:

```text
packages/
├── ast/              # Source model and AST definitions
├── lexer/            # Source text → tokens
├── parser/           # Tokens → AST
├── checker/          # Semantic validation
├── interpreter/      # Policy evaluation and event-chain matching
├── runtime/          # Safe response execution/simulation
├── language-service/ # Diagnostics and language tooling
├── exporters/        # Export/report generation
└── test-runner/      # Example and policy test execution

apps/
└── playground/       # Interactive browser-based experience
```

The expected dependency direction is:

```text
Source
  ↓
Lexer
  ↓
Parser
  ↓
AST
  ↓
Checker
  ↓
Interpreter
  ↓
Runtime
```

Lower-level packages should not import higher-level packages.

When adding functionality, place it in the lowest appropriate layer rather than bypassing the architecture.

---

## Development Principles

Contributions should follow these principles:

### Keep TypeScript Strict

- Preserve strict TypeScript settings.
- Do not introduce `any`.
- Prefer explicit types at package boundaries.
- Avoid unnecessary type assertions.
- Keep public APIs predictable and well documented.

### Preserve Package Boundaries

Keep responsibilities separated between:

- AST modeling
- Lexing
- Parsing
- Semantic checking
- Interpretation
- Runtime behavior
- Language services
- Exporting
- Playground presentation

Do not move logic into a higher-level package simply because it is convenient.

### Prefer Small, Focused Changes

Changes should have a clear purpose.

Avoid unrelated refactoring in the same pull request unless it is necessary for the contribution.

### Preserve Existing Behavior

When modifying existing functionality:

- Understand the current behavior first.
- Add or update tests where behavior changes.
- Avoid breaking existing policies or examples without a deliberate design reason.
- Update documentation when user-visible behavior changes.

---

# Safety Requirements

Bitpall is a **defensive cybersecurity project**.

Safety is a core architectural requirement, not an optional feature.

### Never Execute Real Destructive Actions

Contributions must not introduce code that:

- destroys data,
- disables real accounts,
- terminates real processes,
- isolates real machines,
- modifies real security infrastructure,
- performs unauthorized credential or session manipulation,
- or otherwise performs destructive actions against real systems.

Security responses should remain **simulated, recorded, approval-gated, or otherwise safely contained** within the project's intended execution model.

### Preserve Approval Gates

Actions that require approval must remain approval-gated.

Do not bypass, weaken, or silently remove approval requirements in order to make a test or example pass.

### Keep Examples Safe

Example policies and event streams should use clearly simulated assets, users, telemetry sources, and events.

Examples must not require access to real infrastructure or credentials.

---

# Testing and Validation

Before opening a pull request, contributors should run the project's validation commands from the repository root.

### Formatting

Check formatting with:

```bash
pnpm format:check
```

If formatting needs to be applied:

```bash
pnpm format
```

### Linting

Run:

```bash
pnpm lint
```

Linting should complete without errors or warnings.

### Type Checking

Run:

```bash
pnpm check
```

This verifies that the TypeScript workspace remains type-safe.

### Tests

Run:

```bash
pnpm test
```

All existing tests should pass.

### Build

Run:

```bash
pnpm build
```

The project should build successfully after your changes.

### Example Scenarios

Bitpall includes scenario runners for its representative security workflows:

```bash
pnpm example:ransomware
pnpm example:account-takeover
pnpm example:data-exfiltration
```

When a change affects policy interpretation, checking, runtime behavior, or examples, run the relevant scenario runners as well.

### Full Verification

The repository also provides:

```bash
pnpm verify
```

Use this when performing final validation of the workspace.

---

# Adding or Changing Tests

Tests are an important part of maintaining Bitpall's language behavior.

When changing behavior:

- Add a regression test when practical.
- Update an existing test if its expected behavior intentionally changed.
- Test both successful and unsuccessful cases when appropriate.
- Include malformed-input cases for parsers, validators, and language-facing functionality.
- Verify that diagnostics remain understandable.
- For security-response behavior, verify that unsafe actions remain simulated or approval-gated.

Tests should focus on observable behavior rather than unnecessary implementation details.

---

# Working with Bitpall Policies

When adding or modifying `.bitpall` policies:

- Keep syntax examples readable.
- Use meaningful workspace, asset, telemetry, rule, and test names.
- Include realistic but simulated security scenarios.
- Prefer examples that demonstrate a specific language capability.
- Keep examples safe to execute.
- Update related documentation when syntax or semantics change.

If a policy demonstrates a new language feature, consider adding a corresponding automated test.

---

# Diagnostics

Bitpall uses structured diagnostics to communicate lexer, parser, and semantic errors.

When changing diagnostic behavior:

- Preserve diagnostic codes unless there is a deliberate reason to change them.
- Provide useful source locations.
- Make messages understandable to users.
- Avoid exposing unnecessary internal implementation details.
- Update tests when diagnostic wording or behavior intentionally changes.

A user should be able to understand what went wrong and where it happened.

---

# Documentation

Documentation is considered part of the implementation.

Changes that affect any of the following should generally include documentation updates:

- Bitpall syntax
- Language semantics
- Compiler architecture
- Diagnostics
- Runtime behavior
- Safety behavior
- Playground functionality
- Example scenarios
- Setup or development commands
- Public APIs

At minimum, consider whether the following files need updating:

```text
README.md
CONTRIBUTING.md
PROJECT_STATUS.md
```

Example policies and other documentation should remain consistent with the actual implementation.

---

# Project Status

Contributors must update `PROJECT_STATUS.md` when a contribution affects:

- implementation status,
- roadmap phase status,
- known limitations,
- technical debt,
- architectural decisions,
- verification results,
- or other project-level status information.

Use only the status labels defined by `PROJECT_STATUS.md`.

**Never mark a feature as `COMPLETE` unless its implementation, tests, relevant documentation, and required verification are finished.**

If a feature is intentionally incomplete, document what remains rather than representing it as complete.

---

# Pull Requests

Before opening a pull request:

1. Make sure your branch contains only the intended changes.
2. Run the relevant formatting, linting, type-checking, testing, and build commands.
3. Review your own diff.
4. Update documentation where necessary.
5. Update project status information when applicable.
6. Confirm that no secrets, credentials, personal information, generated artifacts, or unnecessary files have been committed.

### Pull Requests Should

- Have a clear and descriptive title.
- Explain what changed.
- Explain why the change was necessary.
- Mention relevant tests or validation performed.
- Identify any user-visible behavior changes.
- Mention safety implications when runtime or response behavior changes.
- Link related issues, roadmap items, or status updates when applicable.

### Keep Pull Requests Focused

A pull request should ideally address one logical change.

Avoid combining unrelated:

- feature work,
- refactoring,
- formatting changes,
- dependency upgrades,
- or documentation changes

unless they are directly related.

---

# Commit Guidelines

Commits should describe the change clearly.

Prefer focused commits such as:

```text
Add ransomware example policy
Improve diagnostic formatting
Add checker regression tests
Document playground scenarios
```

Avoid vague messages such as:

```text
changes
stuff
fix
update
```

Do not commit secrets, API keys, credentials, local configuration, or machine-specific files.

---

# Before You Submit

Use this checklist before opening a pull request:

- [ ] The change has a clear purpose.
- [ ] Existing architecture boundaries are preserved.
- [ ] TypeScript remains strict.
- [ ] No unnecessary `any` types were introduced.
- [ ] Relevant tests were added or updated.
- [ ] `pnpm format:check` passes.
- [ ] `pnpm lint` passes.
- [ ] `pnpm check` passes.
- [ ] `pnpm test` passes.
- [ ] `pnpm build` passes when relevant.
- [ ] Relevant example scenarios were verified.
- [ ] Documentation was updated where necessary.
- [ ] `PROJECT_STATUS.md` was updated when applicable.
- [ ] No unsafe real-world security actions were introduced.
- [ ] No secrets or sensitive local files were committed.
- [ ] The final Git diff contains only intended changes.

---

## Contribution Philosophy

Bitpall values contributions that make the language **clearer, safer, more useful, and easier to understand**.

When in doubt:

> Prefer a small, well-tested, well-documented change over a large change that introduces unnecessary complexity.

Thank you for helping improve Bitpall.
