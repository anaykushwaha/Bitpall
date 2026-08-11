# Language reference

Supported by the current lexer, parser, checker, interpreter, and test-runner unless noted.

## `workspace`

Top-level container for assets, telemetry, rules, and tests.

Declaration names for assets, telemetry, rules, and tests share one namespace inside a workspace.

## `asset`

Declares a named asset. Initial form:

```aegis
asset endpoint finance_laptop {
  criticality = "high";
}
```

## `telemetry`

Declares a named telemetry source. At least one telemetry declaration is required per workspace.

```aegis
telemetry edr {
  source = "endpoint-agent";
}
```

Rules:

- `source` is required and must be a non-empty string literal
- Duplicate source strings in the same workspace are rejected
- Declared source strings define which mock event `source` values may satisfy detection stages and `require sources`

## `rule`

Contains:

- zero or one `observe`
- zero or more `then`
- zero or more `require`
- zero or one `respond`
- zero or one `rollback`

Duplicate `observe`, `respond`, or `rollback` sections are diagnostics (first occurrence is kept).

## `observe` / `then` / `within`

`observe` matches the first stage. Each `then` stage must match a later event that:

- satisfies the condition
- is at or after the previous matched event
- is within the `within` duration measured from the observe event

Equal timestamps are allowed (`>=`). Tie-breaking uses original input order after timestamp sort.

## `require`

Supported metrics:

- `confidence` — chain confidence is the minimum explicit event confidence; missing confidence is `0`. Threshold must be between `0.0` and `1.0`.
- `sources` — distinct matched event `source` values from declared telemetry. Threshold must be a non-negative integer.

## `respond`

Supported statements:

- `isolate endpoint <asset>;` — simulated
- `preserve evidence;` — simulated
- `revoke sessions user <asset>;` — simulated identity containment
- `disable account <asset>;` — always pending approval (simulation only)
- `approval required for <action>;` — records a pending action

Supported approval action names include `terminate_process` and `disable_account`.

## `rollback`

Supported statements:

- `reconnect endpoint <asset>;` — recorded as rollback metadata only
- `reenable account <asset>;` — recorded as rollback metadata only

## `test`

```aegis
test ransomware_sequence {
  expect rule suspicious_encryption_chain to_match;
}
```

`@aegisscript/test-runner` executes these expectations against interpreter results.

## Operators and literals

See [grammar.md](./grammar.md).
