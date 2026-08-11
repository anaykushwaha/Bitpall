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
4. Try each observe candidate in chronological order. For each candidate, search `then` stages with backtracking:
   - Collect all viable events for the current stage (type, condition, order, `within` from observe)
   - Try each candidate earliest-first
   - If a later stage or a `require` clause fails, backtrack to the next candidate
   - Chain confidence is the **minimum** of matched event confidences (missing = `0`)
   - Source count is distinct declared `source` values on the matched chain
5. On the first complete success, emit a clean success trace and propose responses.
6. If no candidate chain succeeds, the rule does not match.

## Meaning of `within`

`within` is measured from the original `observe` event timestamp. Chronological order between stages is still required: each `then` must be at or after the previous match.

## Outputs

- Rule match results
- Execution trace entries
- Audit log entries
- Pending approval actions
- Recorded rollback actions
