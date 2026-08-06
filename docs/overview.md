# Overview

AegisScript is a defensive detection-to-response language. A policy describes:

- assets worth protecting
- telemetry sources that supply evidence
- multi-stage behavioural rules
- confidence and source-count thresholds
- simulated containment responses
- approval requirements
- rollback metadata
- replayable expectations

## Intended audience

- Detection engineers who want reviewable multi-stage logic
- Security automation engineers exploring safe response orchestration
- Researchers and hackathon teams building compiler and simulator demos

## What this milestone proves

The first slice proves that a policy can be tokenized, parsed, checked, and evaluated against mock events, then produce an audit trail of simulated actions without contacting real systems.
