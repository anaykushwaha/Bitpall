# Safety model

## Simulation-first execution

The only response executor in this phase is `MockResponseExecutor`. It records intended actions and never contacts external security platforms.

## Approval gates

Actions marked with `approval required for ...` are stored as `pending_approval` and are not marked executed.

High-impact identity disablement (`disable_account`) is always pending approval in the mock runtime, even when written as `disable account <asset>;`.

## Protected resources

Protected-resource syntax is not implemented yet. Until it exists, policies should treat all real systems as out of bounds for execution.

## Default-deny response execution

Unsupported or unknown actions are rejected and written to the audit log with status `rejected`.

## Rollback registration

Rollback statements are recorded separately from simulated containment actions. They are not applied to real infrastructure.

## Auditability

Every executor decision produces an audit entry with action type, status, and message.

## Mock event validation

Ordinary malformed event JSON is reported through `validateMockEvents` diagnostics rather than thrown exceptions. Interpretation and tests should only run on validated events.

## Future adapter boundaries

A `ResponseExecutor` interface exists so a future adapter can be introduced without coupling the interpreter to a vendor SDK. Real adapters require a separate security review and are currently deferred.
