# ADR-0001 — Event Driven Architecture

## Status

Accepted

## Decision

Mnelo processes documents using an event-driven pipeline.

## Reason

Document processing, BOQ parsing, entity extraction, AI classification and knowledge creation are independent tasks that can fail, retry and scale separately.

An event-driven architecture supports:

- independent scalable processing;
- reliable retry behavior;
- clear processing status;
- future background workers;
- auditability across long-running AI workflows.

## Consequences

Processing steps should be designed as isolated events with clear inputs, outputs, status and error handling. The application UI should reflect progress without assuming every task completes synchronously.
