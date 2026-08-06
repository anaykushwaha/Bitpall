# Language reference

Supported by the current lexer, parser, checker, and interpreter unless noted.

## `workspace`

Top-level container for assets, telemetry, rules, and tests.

## `asset`

Declares a named asset. Initial form:

```aegis
asset endpoint finance_laptop {
  criticality = "high";
}
```

The asset kind is an identifier. Only endpoint references are used by the initial response actions.

## `telemetry`

Declares a named telemetry source. At least one telemetry declaration is required per workspace.

```aegis
telemetry edr {
  source = "endpoint-agent";
}
```

## `rule`

Contains an optional `observe` stage, zero or more `then` stages, `require` clauses, and optional `respond` / `rollback` blocks.

## `observe` / `then` / `within`

`observe` matches the first stage. Each `then` stage must match a later event inside the declared duration window measured from the observe event timestamp.

## `require`

Supported metrics:

- `confidence` — value must be between `0.0` and `1.0`
- `sources` — distinct mock event `source` values

## `respond`

Supported statements:

- `isolate endpoint <asset>;` — simulated
- `preserve evidence;` — simulated
- `approval required for <action>;` — records a pending action

Supported approval action name in the initial slice: `terminate_process`.

## `rollback`

Supported statement:

- `reconnect endpoint <asset>;` — recorded as rollback metadata only

## `test`

```aegis
test ransomware_sequence {
  expect rule suspicious_encryption_chain to_match;
}
```

Test declarations are parsed and checked. Dedicated test-runner execution is not complete; integration tests drive the interpreter directly.

## Operators and literals

See [grammar.md](./grammar.md).
