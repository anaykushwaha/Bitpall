# Bitpall

**Behavioral Intelligence & Threat Protection Automation Logic Language**

Bitpall is a cybersecurity domain-specific language for expressing multi-stage behavioral threat detection and automated response logic declaratively — with explainable matching and a simulation-only response model.

> **Safety:** All responses in this repository are simulated through a mock executor. Bitpall does not isolate real endpoints, disable real accounts, revoke real sessions, terminate real processes, or modify external systems.

## Problem

Security teams often need to detect multi-stage attacks (exploit → lateral behavior → impact) and decide what to do next. That logic is usually scattered across vendor consoles, scripts, and tickets. It is hard to:

- express ordered event chains with timing windows in one place
- require confidence and multi-source evidence before acting
- keep approval-gated high-impact actions next to the detection rule
- explain exactly why a chain matched
- replay the same scenario deterministically

## Solution

Bitpall is a small declarative DSL for detection-and-response policies. A policy describes what to observe, which follow-on stages must occur, what evidence thresholds apply, which responses to plan, and which actions need approval — then evaluates mock security events through a deterministic interpreter.

## Bitpall example

```bitpall
workspace corporate_network {
  telemetry edr { source = "endpoint-agent"; }
  telemetry filesystem { source = "file-monitor"; }

  rule suspicious_encryption_chain {
    observe process_start where process.name == "powershell.exe";
    then file_write where file.extension == ".encrypted" within 2m;

    require confidence >= 0.80;
    require sources >= 2;

    respond {
      isolate endpoint finance_laptop;
      preserve evidence;
      approval required for terminate_process;
    }
  }
}
```

## How it works

```text
.bitpall source
      ↓
Lexer → Parser → Typed AST → Semantic check
      ↓
Interpreter evaluates mock security events
      ↓
Detection result + matched event chain
      ↓
Structured condition & requirement explanations
      ↓
Response plan (simulated / pending approval)
      ↓
Mock executor audit log (no real side effects)
      ↓
Markdown detection report (optional export)
```

Judges can inspect **Detection → Event chain → Response** in the playground, then **Export Markdown** for a deterministic security report. Compiler diagnostics stay visible by default; AST and raw detection traces live under **Advanced**.

## Three scenarios

| Scenario                 | Story                                                                                                |
| ------------------------ | ---------------------------------------------------------------------------------------------------- |
| **Exploit → Ransomware** | PowerShell start → encrypted file write; isolate endpoint; terminate process pending approval        |
| **Account Takeover**     | Suspicious login → MFA failure → privilege change; revoke sessions; disable account pending approval |
| **Data Exfiltration**    | Sensitive access → staging → large outbound transfer; isolate endpoint                               |

Each scenario includes positive matches plus negative cases (incomplete chains, low confidence, benign traffic).

## Safety model

Bitpall uses a `ResponseExecutor` abstraction with a **mock/simulation executor** only. Planned actions are recorded as `simulated`, `pending_approval`, or `recorded_rollback`. Nothing in this repo talks to real security products or host APIs.

## Setup

Requires **Node.js 20+** and **pnpm 9.15** (see `packageManager` in `package.json`).

```bash
pnpm install
```

## Usage

```bash
pnpm dev                         # playground at http://localhost:5173
pnpm example:ransomware
pnpm example:account-takeover
pnpm example:data-exfiltration
```

In the playground: pick a scenario, edit policy/events if desired, then **Run Simulation** or **Run Tests**. After a simulation, use **Export Markdown** to download a Bitpall detection report.

### Markdown export (programmatic)

```ts
import { exportDocumentation } from "@bitpall/exporters";

const markdown = exportDocumentation({
  format: "markdown",
  program,
  result, // InterpretResult from @bitpall/interpreter
  events,
  scenarioName: "Exploit → Ransomware",
});
```

## Testing

```bash
pnpm format:check
pnpm lint
pnpm check
pnpm test
pnpm build
pnpm verify
pnpm example:ransomware
pnpm example:account-takeover
pnpm example:data-exfiltration
```

`pnpm verify` checks workspace package wiring. The three `example:*` commands run the end-to-end demo scenarios (also enforced in CI). Integration tests cover positive and negative cases. Manual playground browser QA is separate and remains a human step.

## Architecture

| Path                        | Role                                                   |
| --------------------------- | ------------------------------------------------------ |
| `packages/lexer`            | Tokenization                                           |
| `packages/ast`              | Typed AST, diagnostics (`BITPALL####`), product naming |
| `packages/parser`           | Recursive-descent parser                               |
| `packages/checker`          | Semantic validation                                    |
| `packages/interpreter`      | Event-chain matching + structured explanations         |
| `packages/runtime`          | Mock response executor and audit log                   |
| `packages/test-runner`      | `expect rule … to_match` replay                        |
| `packages/language-service` | Thin analyze API (not a full LSP)                      |
| `packages/exporters`        | Deterministic Markdown detection-report export         |
| `apps/playground`           | Browser editor, demo simulator, Markdown download      |
| `examples/`                 | Three core cybersecurity demos                         |

## Capabilities

- Cybersecurity-focused DSL (`.bitpall`)
- Lexer → parser → AST → checker → interpreter → mock runtime
- Temporal multi-stage event-chain detection with explainability
- Confidence / source requirements
- Simulated response actions with approval gates and rollback metadata
- Three end-to-end scenarios (ransomware, account takeover, data exfiltration)
- Interactive playground
- Deterministic Markdown security-report export

## Documentation

- [Overview](./docs/overview.md)
- [Getting started](./docs/getting-started.md)
- [Architecture](./docs/architecture.md)
- [Grammar](./docs/grammar.md)
- [Language reference](./docs/language-reference.md)
- [Runtime model](./docs/runtime-model.md)
- [Safety model](./docs/safety-model.md)

## Limitations (deliberate scope)

This is a hackathon/demo prototype. It does **not** currently include:

- production security-product integrations
- real endpoint / identity / network mutation
- full Language Server Protocol or VS Code extension
- modules, macros, or package publishing
- formats beyond Markdown for exporters (JSON/PDF/etc.)

Those are intentional boundaries for this stage — not incomplete claims of production readiness.

## License

See [LICENSE](./LICENSE).
