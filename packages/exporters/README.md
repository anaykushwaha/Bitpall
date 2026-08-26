# @bitpall/exporters

Deterministic documentation exporters for Bitpall analysis results.

Currently implemented:

- **Markdown** detection report (`format: "markdown"`)

## Usage

```ts
import { exportDocumentation } from "@bitpall/exporters";
import type { ProgramNode } from "@bitpall/ast";
import type { InterpretResult, MockSecurityEvent } from "@bitpall/interpreter";

const markdown = exportDocumentation({
  format: "markdown",
  program,
  result,
  events,
  scenarioName: "Account Takeover",
});
```

The exporter presents structured interpreter/runtime results. It does **not** re-evaluate detection logic.

Reports are deterministic: identical inputs produce identical Markdown (no automatic timestamps or random IDs).
