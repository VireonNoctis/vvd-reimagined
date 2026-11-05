# Architecture

Document the architecture that exists, not the architecture that might exist one day.

## System overview

Describe the project's main responsibilities, runtime boundaries, and external systems.

## Components

| Component | Responsibility | Owns |
| --- | --- | --- |
| Replace me | Describe one real component | State, data, or interface it owns |

## Data flow

Describe the important request, event, or data flows. Add a diagram only when it makes the system easier to understand.

## Boundaries and invariants

- Record the rules that must remain true across components.
- Identify trust boundaries and where input is validated.
- Explain how failures, retries, and timeouts are handled.

## Operations

Document configuration, observability, deployment, migrations, backups, and recovery where relevant.

## Related decisions

Link to records in [DECISIONS](DECISIONS/README.md) for significant architectural trade-offs.
