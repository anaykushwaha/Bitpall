# Bitpall

**Behavioral Intelligence & Threat Protection Automation Logic Language**

Bitpall is a cybersecurity domain-specific language for expressing deterministic multi-stage threat detection and safe automated response policies.

Security automation is often split across vendor-specific rule formats, scripts, and response APIs. Bitpall explores a safer declarative language for detection-and-response workflows with explicit evidence, confidence, approval, rollback, and testing semantics.

> **Safety:** All responses in this repository are simulated. Bitpall does not disable real users, isolate real machines, terminate real processes, revoke real sessions, or block real network traffic.

### What BITPALL stands for

| Piece                       | Meaning                                                                         |
| --------------------------- | ------------------------------------------------------------------------------- |
| **Behavioral Intelligence** | Models meaningful sequences of security behavior.                               |
| **Threat Protection**       | Expresses defensive detection and containment policies.                         |
| **Automation Logic**        | Defines deterministic responses, approvals, rollback, and tests.                |
| **Language**                | Provides a purpose-built cybersecurity DSL rather than vendor-specific scripts. |

## What problem does it solve?

Detection content and response playbooks are usually scattered across consoles, tickets, and ad-hoc scripts. That makes it hard to:

- express ordered attack sequences with timing windows
- require confidence and multi-source evidence before acting
- keep approval gates and rollback steps next to the detection logic
- replay deterministic security tests

## What is Bitpall?

Bitpall is an experimental defensive cybersecurity DSL. Policies describe:

1. what to observe
2. which follow-on events must occur
3. evidence thresholds
4. simulated containment responses
5. approval-gated high-impact actions
6. rollback metadata
7. executable `test` expectations

## Why a DSL?

A small domain language keeps detection, evidence, and response reviewable in one place—without binding the prototype to a single vendor API.

## What the demo shows

Three end-to-end scenarios on the same language and mock runtime:

| Example                  | What it demonstrates                                                     |
| ------------------------ | ------------------------------------------------------------------------ |
| **Exploit → Ransomware** | Ordered process/encryption chain with endpoint isolation                 |
| **Account Takeover**     | Suspicious identity chain with session revoke + pending account disable  |
| **Data Exfiltration**    | Sensitive access → staging → outbound transfer with endpoint containment |

Open the playground, switch scenarios, run simulation, and inspect detection / event chain / response plan.

## How do I run it?

Requires Node.js 20+ and pnpm 9+.

```bash
pnpm install
pnpm test
pnpm build
pnpm dev                 # playground at http://localhost:5173
pnpm example:ransomware
pnpm example:account-takeover
pnpm example:data-exfiltration
```

## Architecture

```text
Bitpall source
        ↓
      Lexer
        ↓
      Parser
        ↓
       AST
        ↓
 Semantic checker
        ↓
    Interpreter  →  Mock runtime  →  Audit / responses
        ↓
   Test runner (expect rule … to_match)
```

| Path                        | Role                                            |
| --------------------------- | ----------------------------------------------- |
| `packages/lexer`            | Tokenization                                    |
| `packages/ast`              | Typed AST, diagnostics, product naming          |
| `packages/parser`           | Recursive-descent parser                        |
| `packages/checker`          | Semantic validation                             |
| `packages/interpreter`      | Deterministic event-chain matching              |
| `packages/runtime`          | Mock response executor and audit log            |
| `packages/test-runner`      | Replay DSL tests                                |
| `packages/language-service` | Thin analyze API                                |
| `packages/exporters`        | Scaffold only                                   |
| `apps/playground`           | Browser editor and demo simulator               |
| `examples/`                 | Ransomware, account-takeover, data-exfiltration |

## Documentation

- [Overview](./docs/overview.md)
- [Getting started](./docs/getting-started.md)
- [Architecture](./docs/architecture.md)
- [Grammar](./docs/grammar.md)
- [Language reference](./docs/language-reference.md)
- [Runtime model](./docs/runtime-model.md)
- [Safety model](./docs/safety-model.md)
- [Project status](./PROJECT_STATUS.md)

## Current maturity

Hackathon/demo prototype. See [PROJECT_STATUS.md](./PROJECT_STATUS.md). Not production-ready.

## License

See [LICENSE](./LICENSE).
