# ADR-0002 — AI Audit Trail

## Status

Accepted

## Decision

AI never silently modifies project information.

## Reason

Construction procurement requires explainability. Users must understand what changed, why it changed and what source supported the decision.

AI-generated outputs must include:

- source;
- confidence score;
- reason;
- timestamp;
- user confirmation or correction when applicable.

## Consequences

AI actions must be stored with enough metadata to support review, correction and future learning. Low-confidence outputs must be visible in a review flow instead of being treated as final truth.
