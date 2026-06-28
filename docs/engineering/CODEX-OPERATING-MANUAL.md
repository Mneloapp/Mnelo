# Codex Operating Manual

## Purpose

This document defines how Codex must behave when developing Mnelo.

This document is not about code. It is about engineering discipline.

## Mission

Codex's responsibility is not to generate code.

Codex's responsibility is to help build Mnelo as a long-term product.

Every implementation must preserve architecture, maintainability and business intent.

## Core Principles

1. Never optimize for speed over architecture.
2. Never invent new architecture without an Engineering Specification.
3. Never implement features outside the current Engineering Order.
4. Never bypass documented workflows.
5. Always preserve backward compatibility unless explicitly instructed.

## Source of Truth

The order of authority is:

1. Architecture Decisions (ADR)
2. Engineering Specifications (MES)
3. Requirement Domain Model
4. Build Book
5. Development Orders
6. Application Code

Code never becomes the source of truth.

Documentation is the source of truth.

## Development Workflow

Every implementation follows:

1. Architecture Review
2. Engineering Specification
3. Development Order
4. Implementation
5. Build
6. Testing
7. Architecture Review
8. Merge

Never skip steps.

## Engineering Rules

Before changing code:

- Read the relevant MES document.
- Read related ADR documents.
- Understand current architecture.
- Search for existing implementation.
- Reuse before creating.

## Bug Fix Rules

Never patch blindly.

Always identify:

1. Root Cause
2. Evidence
3. Minimal Fix
4. Regression Test

Bug fixes require proof.

## AI Rules

Never call AI directly from business logic.

AI must always execute through Mnelo AI Runtime.

Never couple domain logic to an AI provider.

AI providers must remain replaceable.

## Domain Rules

The core domain object is:

Requirement.

Not BOQ.

Not RFQ.

Not Purchase Order.

Requirements own the workflow.

Packages group Requirements.

RFQs operate on Packages.

Quotes connect back to Requirements.

Procurement continues from Requirements.

## Classification Rules

Priority:

1. User
2. Learned
3. AI
4. Rules
5. Unknown

Never overwrite user decisions.

Never silently downgrade learned knowledge.

## UI Rules

Every page must have one purpose.

Avoid information overload.

Always guide the next action.

Never expose engineering/debug information by default.

## Database Rules

Never introduce schema changes without documentation.

Never rename production columns casually.

Prefer additive migrations.

Never destroy user data.

## Documentation Rules

Every important architectural decision must be documented.

Every new domain concept requires an MES.

Every workflow change updates Build Book.

## Code Quality Rules

TypeScript only.

Avoid `any`.

Keep modules small.

Prefer composition over duplication.

One responsibility per module.

## Commit Rules

One logical change per commit.

Meaningful commit messages.

Never mix unrelated fixes.

## Testing Rules

Every Development Order must finish with:

- lint
- typecheck
- build

If possible:

- regression verification

## Design Philosophy

Mnelo is not:

- a BOQ parser
- an Excel viewer
- an admin dashboard

Mnelo is:

An AI Procurement Operating System for Construction.

Every implementation must move the product toward that vision.

## Final Rule

When uncertain:

Stop.

Explain the uncertainty.

Request clarification.

Never invent business behavior.
