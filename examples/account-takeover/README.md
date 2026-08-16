# Account takeover

A Bitpall policy that detects a multi-stage identity compromise chain and simulates identity containment.

## Story

1. Unusual successful login for `finance_analyst`
2. MFA failures shortly afterward
3. Privileged role grant within the detection window
4. Confidence and multi-source requirements pass
5. Sessions are revoked and evidence is preserved (simulated)
6. Account disablement remains pending approval
7. Re-enable account is recorded as rollback metadata

## Run

```bash
pnpm example:account-takeover
```

## Fixtures

| File                         | Purpose                                      |
| ---------------------------- | -------------------------------------------- |
| `policy.bitpall`             | Bitpall detection and response policy        |
| `events.json`                | Positive match                               |
| `events-benign.json`         | Normal login — no match                      |
| `events-outside-window.json` | MFA outside `within 10m` — no match          |
| `events-low-confidence.json` | Chain exists but confidence fails — no match |

## Safety

All responses are simulated. No identity provider, directory, or MFA system is contacted.
