# Mnelo Constitution

## Product Identity

Mnelo is an AI Procurement Operating System for Construction.

It exists to help construction teams convert project documents into structured knowledge, RFQ packages, supplier decisions, quote comparisons, estimates and procurement execution.

## Constitutional Principles

1. **Knowledge first.** Every meaningful interaction should create or improve reusable procurement knowledge.
2. **Explainability always.** AI decisions must include source, confidence and reason.
3. **Human control.** Users must be able to review, correct, confirm and override AI outputs.
4. **No silent mutation.** Mnelo must not silently modify project information.
5. **Preserve raw truth.** Uploaded documents and raw parsed data must remain traceable.
6. **Multi-discipline by design.** Mnelo starts with MEP contractors but must support all construction disciplines.
7. **Compounding intelligence.** Corrections and confirmations must improve future projects.
8. **Business value filter.** Features must save time, save money or create reusable procurement knowledge.

## Engineering Principles

| Principle | Requirement |
| --- | --- |
| Event-driven processing | Long-running document work should be handled as independent processing steps |
| Auditability | AI actions and user corrections must be logged |
| Versioning | Documents, entities and knowledge must support history |
| Reversibility | Users must be able to understand and correct system outputs |
| Incremental complexity | Build the simplest reliable mechanism before adding autonomous behavior |

## AI Rules

AI may classify, extract, summarize and recommend. AI must not silently approve, delete, overwrite or finalize procurement knowledge without an auditable path.

## Documentation Rule

Major product and architecture decisions must be documented before implementation. These documents are the source of truth for future engineering work.
