# Data exfiltration

A Bitpall policy that detects sensitive-data access followed by staging and a large outbound transfer, then simulates endpoint containment.

## Story

1. Confidential file access
2. Bulk staging / archive activity
3. Large outbound network transfer
4. Confidence and multi-source requirements pass
5. Endpoint isolation and evidence preservation are simulated
6. Process termination remains pending approval
7. Reconnect is recorded as rollback metadata

## Run

```bash
pnpm example:data-exfiltration
```

## Fixtures

| File                              | Purpose                                         |
| --------------------------------- | ----------------------------------------------- |
| `policy.bitpall`                  | Bitpall detection and response policy           |
| `events.json`                     | Positive match                                  |
| `events-no-sensitive-access.json` | Transfer without confidential access — no match |
| `events-no-outbound.json`         | Access + staging without outbound — no match    |
| `events-outside-window.json`      | Stages outside `within` windows — no match      |
| `events-low-confidence.json`      | Chain exists but confidence fails — no match    |

## Safety

All responses are simulated. No DLP, EDR, or network controls are contacted.
