# Bitpall

## Behavioral Intelligence & Threat Protection Automation Logic Language

**Bitpall** is a cybersecurity-focused **domain-specific language (DSL)** for expressing multi-stage behavioral threat detection and response logic declaratively.

Instead of scattering detection logic across scripts, security-product configuration, and incident-response procedures, Bitpall lets users describe **what to detect, what evidence is required, how events must relate in time, and what safe response should be planned** in one readable policy.

Bitpall includes a lexer, parser, typed AST, semantic checker, deterministic event-chain interpreter, safe response runtime, structured diagnostics, an interactive playground, and deterministic Markdown report generation.

> **Safety:** Bitpall is simulation-only. All response actions are handled by a mock executor. This repository does not isolate real endpoints, disable real accounts, revoke real sessions, terminate real processes, or modify external systems.

---

## Why Bitpall?

Modern attacks are often not a single event.

A suspicious PowerShell process by itself may be benign. A file being encrypted by itself may also be benign. But when those events occur **in a specific order, within a defined time window, with sufficient confidence and evidence from multiple telemetry sources**, they can form a meaningful behavioral signal.

Traditional security logic can make these relationships difficult to express and explain.

Bitpall treats the detection chain itself as a first-class language construct.

A policy can express:

* ordered multi-stage attack behavior
* temporal relationships between events
* confidence thresholds
* minimum telemetry-source requirements
* response plans
* approval-gated high-impact actions
* rollback metadata
* deterministic test scenarios
* explainable detection results

This makes security logic easier to **write, inspect, test, replay, and explain**.

---

## The Problem

Security teams often need to detect multi-stage attacks such as:

```text
Exploit → Execution → Persistence → Impact
```

or:

```text
Suspicious Login → MFA Failure → Privilege Change
```

or:

```text
Sensitive Access → Staging → Large Outbound Transfer
```

That logic is frequently distributed across vendor consoles, detection rules, scripts, tickets, and response procedures.

This creates several problems:

* ordered event chains are difficult to express in one place
* timing relationships can become difficult to reason about
* evidence requirements may be disconnected from detection logic
* high-impact responses may not be visibly connected to the detection that triggered them
* analysts may struggle to understand exactly why a detection matched
* reproducing the same scenario for testing can be difficult
* response automation introduces additional safety concerns

Bitpall addresses these problems by providing a small language specifically designed around **behavioral detection and safe response planning**.

---

# The Solution

A Bitpall policy describes:

1. **What behavior to observe**
2. **What subsequent events must occur**
3. **How events must be ordered**
4. **How long the chain may take**
5. **How much confidence is required**
6. **How many telemetry sources must support the chain**
7. **What response should be planned**
8. **Which actions require approval**
9. **How rollback information should be recorded**

The interpreter then evaluates simulated security events deterministically and produces:

* a detection result
* the matched event chain
* confidence and telemetry-source information
* structured explanations
* a response plan
* audit information
* approval-pending actions
* rollback metadata

No real security infrastructure is modified.

---

# Bitpall in Action

A simplified ransomware policy looks like this:

```bitpall
workspace corporate_network {

  telemetry edr {
    source = "endpoint-agent";
  }

  telemetry filesystem {
    source = "file-monitor";
  }

  rule suspicious_encryption_chain {

    observe process_start
      where process.name == "powershell.exe";

    then file_write
      where file.extension == ".encrypted"
      within 2m;

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

The policy expresses the complete detection idea in one place:

```text
PowerShell starts
       ↓
Encrypted file is written within 2 minutes
       ↓
Confidence ≥ 0.80
       ↓
Evidence from ≥ 2 telemetry sources
       ↓
Detection matches
       ↓
Plan endpoint isolation
       ↓
Preserve evidence
       ↓
Require approval before process termination
```

The important part is that the **detection logic and response plan remain connected and readable**.

---

# How It Works

```text
.bitpall source
      ↓
Lexer
      ↓
Parser
      ↓
Typed AST
      ↓
Semantic Checker
      ↓
Interpreter
      ↓
Mock Security Events
      ↓
Detection Result
      ↓
Matched Event Chain
      ↓
Structured Explanations
      ↓
Response Plan
      ↓
Mock Executor
      ↓
Audit / Approval / Rollback Metadata
      ↓
Optional Markdown Report
```

The compiler and execution pipeline is deliberately separated into distinct stages so that each responsibility can be tested independently.

---

# Detection → Event Chain → Response

The playground presents the core Bitpall workflow in a judge- and user-friendly way:

```text
Detection
   ↓
Event Chain
   ↓
Response
```

The detection section explains whether the rule matched.

The event-chain section shows the events that satisfied the rule and their ordering.

The response section shows what Bitpall planned to do, including whether an action was simulated, required approval, or was recorded as rollback metadata.

More detailed AST information and raw interpreter traces are available under **Advanced**.

This allows users to understand the result without needing to inspect implementation details.

---

# Explainability and Deterministic Replay

Bitpall does not simply answer:

```text
MATCH
```

It provides context for the decision.

The interpreter can explain:

* which events matched each stage
* why candidate events were rejected
* whether an event occurred outside a time window
* whether confidence requirements were satisfied
* whether sufficient telemetry sources were present
* why a complete chain failed
* which response actions were planned
* which actions require approval

The same policy and mock event stream can also be replayed deterministically.

This makes Bitpall suitable for demonstrations, testing, debugging, and reasoning about detection behavior.

---

# Three Demonstration Scenarios

Bitpall includes three complete cybersecurity scenarios.

| Scenario                 | Detection chain                                      | Example response                                     |
| ------------------------ | ---------------------------------------------------- | ---------------------------------------------------- |
| **Exploit → Ransomware** | PowerShell start → encrypted file write              | Isolate endpoint; terminate process pending approval |
| **Account Takeover**     | Suspicious login → MFA failure → privilege change    | Revoke sessions; disable account pending approval    |
| **Data Exfiltration**    | Sensitive access → staging → large outbound transfer | Isolate endpoint                                     |

Each scenario includes both **positive and negative cases**, including incomplete chains, insufficient confidence, insufficient telemetry sources, and benign or otherwise non-matching activity.

The scenarios demonstrate that Bitpall is more than a syntax exercise: the language is connected to an executable detection and response model.

---

# Safety Model

Safety is a fundamental design constraint of Bitpall.

Bitpall defines a `ResponseExecutor` abstraction, but this repository provides only a **mock/simulation executor**.

Response actions are represented through safe states such as:

```text
simulated
pending_approval
recorded_rollback
```

Examples of actions represented by the runtime include:

* endpoint isolation
* process termination
* session revocation
* account disablement
* evidence preservation
* endpoint reconnection
* account re-enablement

These actions are **simulated or recorded**.

Nothing in this repository communicates with real endpoints, identity providers, network infrastructure, operating-system security APIs, or external security products.

High-impact actions can also be explicitly approval-gated:

```bitpall
approval required for terminate_process;
```

This keeps the demonstration focused on **security automation logic and language design without introducing real-world destructive side effects**.

---

# Interactive Playground

Bitpall includes a browser-based playground for interacting with the language.

The playground allows users to:

* select cybersecurity scenarios
* edit Bitpall policies
* edit simulated security events
* run policy simulations
* run policy tests
* inspect detection results
* inspect matched event chains
* inspect response plans
* view detailed AST and interpreter trace information
* export deterministic Markdown detection reports

The playground is intended to make the language understandable without requiring users to interact directly with the underlying TypeScript packages.

---

# Markdown Detection Reports

After running a simulation, the playground can export a deterministic Markdown security report.

The exporter can also be used programmatically:

```ts
import { exportDocumentation } from "@bitpall/exporters";

const markdown = exportDocumentation({
  format: "markdown",
  program,
  result,
  events,
  scenarioName: "Exploit → Ransomware",
});
```

The report provides a portable representation of the detection result and its supporting information.

---

# Architecture

Bitpall is implemented as a TypeScript monorepo with separated compiler, analysis, execution, and presentation layers.

| Path                        | Responsibility                                                          |
| --------------------------- | ----------------------------------------------------------------------- |
| `packages/lexer`            | Converts source text into tokens                                        |
| `packages/ast`              | Typed AST, source models, diagnostics, and core language types          |
| `packages/parser`           | Recursive-descent parsing                                               |
| `packages/checker`          | Semantic validation and policy consistency checks                       |
| `packages/interpreter`      | Temporal event-chain matching and structured explanations               |
| `packages/runtime`          | Safe mock response execution and audit logging                          |
| `packages/test-runner`      | Replays policy tests such as `expect rule … to_match`                   |
| `packages/language-service` | Lightweight source-analysis and diagnostic API                          |
| `packages/exporters`        | Deterministic Markdown detection-report generation                      |
| `apps/playground`           | Browser-based policy editor, simulator, results UI, and report download |
| `examples/`                 | End-to-end cybersecurity scenarios                                      |

The primary processing flow is:

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

This separation keeps language processing, semantic analysis, detection logic, response simulation, and user experience independently testable.

---

# Core Capabilities

Bitpall currently provides:

* Cybersecurity-focused `.bitpall` language
* Declarative behavioral detection policies
* Lexer and recursive-descent parser
* Typed AST
* Semantic checking
* Structured diagnostics with source locations
* Temporal multi-stage event-chain detection
* Deterministic candidate selection and backtracking
* Confidence requirements
* Multi-source telemetry requirements
* Explainable detection traces
* Simulated response actions
* Approval-gated actions
* Rollback metadata
* Mock runtime and audit logging
* Policy test execution
* Three complete cybersecurity scenarios
* Interactive browser playground
* Deterministic Markdown security-report export

---

# Setup

## Requirements

* **Node.js 20+**
* **pnpm 9.15+**

The repository's `package.json` specifies the expected package-manager version.

Install dependencies from the repository root:

```bash
pnpm install
```

---

# Running the Playground

Start the interactive playground with:

```bash
pnpm dev
```

Open the local URL displayed by the development server.

From the playground, select a scenario, inspect or modify the policy and event stream, and choose **Run Simulation** or **Run Tests**.

After a simulation, use **Export Markdown** to generate a detection report.

---

# Example Scenario Runners

The three scenarios can also be executed directly from the command line:

```bash
pnpm example:ransomware
pnpm example:account-takeover
pnpm example:data-exfiltration
```

These provide a quick way to verify the end-to-end behavior of the demonstration scenarios without opening the playground.

---

# Testing and Validation

The project provides a complete local validation workflow:

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

### What these checks cover

* **Formatting** — verifies repository formatting
* **Linting** — checks TypeScript and source-code quality
* **Type checking** — verifies workspace type safety
* **Tests** — runs automated unit and integration tests
* **Build** — verifies that packages and applications compile successfully
* **Verification** — checks workspace/package wiring
* **Scenario runners** — exercise the three end-to-end cybersecurity demonstrations

Automated tests cover both positive and negative behavior.

Manual browser QA of the playground is an additional human verification step.

---

# Documentation

More detailed documentation is available in `docs/`:

* [Overview](./docs/overview.md)
* [Getting Started](./docs/getting-started.md)
* [Architecture](./docs/architecture.md)
* [Grammar](./docs/grammar.md)
* [Language Reference](./docs/language-reference.md)
* [Runtime Model](./docs/runtime-model.md)
* [Safety Model](./docs/safety-model.md)

For contribution and development guidelines, see [CONTRIBUTING.md](./CONTRIBUTING.md).

---

# Project Scope and Deliberate Limitations

Bitpall is a **hackathon/demo prototype**, not a production security platform.

The current project intentionally does not provide:

* production security-product integrations
* real endpoint, identity, or network mutation
* real destructive security actions
* a full Language Server Protocol implementation
* a VS Code extension
* modules, macros, or package publishing
* JSON/PDF or other exporter formats beyond Markdown

These are deliberate scope boundaries.

Bitpall demonstrates the **language design, compiler pipeline, behavioral detection model, explainability, safe response architecture, testing model, and interactive user experience** without claiming production readiness.

---

# Project Status

The current implementation represents the completed scope of the Bitpall hackathon project.

The project has:

* a working language pipeline
* semantic validation
* deterministic interpretation
* simulated response execution
* automated tests
* end-to-end example scenarios
* an interactive playground
* Markdown report export
* project documentation
* an explicit safety model

Future production-oriented capabilities would require additional engineering, security review, infrastructure integrations, and operational safeguards.

---

# Contributing

Contributions are welcome.

Before contributing, please read [CONTRIBUTING.md](./CONTRIBUTING.md) for:

* development setup
* architecture guidelines
* coding standards
* testing requirements
* safety requirements
* documentation expectations
* pull-request guidelines

---

# License

See [LICENSE](./LICENSE).

