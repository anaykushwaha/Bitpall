# Runtime model

## Inputs

- A checked program AST
- An ordered list of mock security events

Each event includes:

- `id`
- `type`
- `timestamp` (ISO-8601 string or epoch milliseconds)
- `properties` object for condition evaluation
- optional `source`
- optional `confidence`

## Matching

1. Find the first event matching the `observe` stage.
2. For each `then` stage, find a later unused event that matches the condition and falls within the duration window.
3. Aggregate confidence as the maximum explicit event confidence, or `1.0` when no event supplies confidence.
4. Count distinct non-empty `source` values.
5. Evaluate `require` clauses.
6. If matched, propose response and rollback actions to the runtime executor.

## Outputs

- Rule match results
- Execution trace entries
- Audit log entries
- Pending approval actions
- Recorded rollback actions
