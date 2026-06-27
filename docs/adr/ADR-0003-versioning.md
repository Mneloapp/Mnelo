# ADR-0003 — Versioning

## Status

Accepted

## Decision

Documents, entities and knowledge must all support version history.

## Reason

Construction projects constantly evolve through revisions. Tender documents, drawings, addenda, BOQs, specifications and supplier responses may change throughout the project lifecycle.

Mnelo must be able to explain:

- what changed;
- when it changed;
- which source introduced the change;
- what knowledge was superseded;
- which procurement decisions were affected.

## Consequences

Future implementations must avoid overwriting important project information without history. New revisions should supersede older knowledge while preserving traceability.
