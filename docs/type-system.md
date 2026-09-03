# Type system

The initial milestone does not implement a rich type system.

Current validation is structural and semantic:

- declaration uniqueness
- asset and rule reference resolution
- duration positivity
- confidence range checking
- respond/rollback structural constraints
- unsupported response action names

Planned later:

- typed telemetry schemas
- typed event payloads (so property paths such as `file.extension` can be validated statically)
- protected-resource kinds
- action capability types
