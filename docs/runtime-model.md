# Runtime model

## Inputs

- A checked program AST
- An ordered list of **validated** mock security events (`validateMockEvents`)

Each event includes:

- `id` (unique non-empty string)
- `type` (non-empty string)
- `timestamp` (ISO-8601 string or finite epoch milliseconds)
- `properties` object for condition evaluation
- optional `source` (non-empty string when present)
- optional `confidence` (finite number in `0..1` when present)

## Telemetry eligibility

Each workspace collects `source` string values from its `telemetry` declarations.

- Events whose `source` is missing or not in that set are **ignored for detection stages**.
- Ignored events also do **not** count toward `require sources`.
- The interpreter may emit a trace note when an otherwise type/condition-relevant event is skipped for undeclared telemetry.

## Matching

1. Sort events by timestamp ascending. Equal timestamps keep original input order.
2. Collect eligible events whose `source` is declared for the workspace.
3. Find all eligible events matching the `observe` stage.
4. Try each observe candidate in chronological order until one produces a complete chain:
   - For each `then` stage, find a later unused eligible event that matches type/condition, is at or after the previous match, and is at or before `observeTime + within`
   - Compute chain confidence as the **minimum** of matched event confidences (missing = `0`)
   - Count distinct declared `source` values on the matched chain
   - Evaluate `require` clauses
5. On the first complete success, propose response and rollback actions to the runtime executor.
6. If no candidate succeeds, the rule does not match.

## Meaning of `within`

`within` is measured from the original `observe` event timestamp. Chronological order between stages is still required: each `then` must be at or after the previous match.

## Outputs

- Rule match results
- Execution trace entries
- Audit log entries
- Pending approval actions
- Recorded rollback actions
