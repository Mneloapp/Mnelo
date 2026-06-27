# MES-003 — Domain Model

## Purpose

This engineering specification defines how Mnelo should introduce and use domain modeling across product and engineering work.

Mnelo is a Construction Procurement Operating System. New features should use the same domain language so AI Runtime, Knowledge Graph, Project Intelligence and future Procurement Engine work from one shared model.

## Domain-Driven Design Approach

Mnelo should use practical domain-driven design. The goal is not ceremony; the goal is consistency, explainability and long-term platform clarity.

The domain model should:

- describe business concepts before implementation details;
- keep project intelligence and procurement concepts explicit;
- allow AI agents to work with structured context;
- allow knowledge to link back to source evidence;
- support future versioning and domain events.

## Entity Naming Rules

| Rule | Requirement |
| --- | --- |
| Use business names | Prefer `Project`, `Document`, `ProcessingJob`, `KnowledgeNode` over generic names |
| Avoid UI names | Do not name domain entities after screens or components |
| Avoid provider names | AI provider details should not appear in core domain entity names |
| Preserve construction meaning | Terms should match construction procurement language |
| Use singular entity names | Entity names should be singular and stable |

## Aggregate Boundaries

Aggregates define consistency boundaries. They should remain practical and small enough to implement incrementally.

| Aggregate | Owns |
| --- | --- |
| Project Aggregate | Project context, workspace status, project-level document and intelligence references |
| Document Aggregate | Document identity, versions, processing jobs and source evidence |
| Knowledge Aggregate | Knowledge nodes, relationships, provenance, confidence and verification |
| Procurement Package Aggregate | Grouped product requirements, RFQ scope and quote package state |
| Supplier Aggregate | Supplier profile, contacts, capabilities and performance signals |
| Product Aggregate | Product identity, manufacturer, specifications and matching history |

## Value Object Rules

Value objects should be immutable in application logic and validated close to creation.

| Value Object | Rule |
| --- | --- |
| Money | Always include amount and currency |
| Quantity | Always include value and unit |
| Confidence Score | Must be normalized between 0 and 1 or clearly documented as percentage |
| Revision | Must be comparable and history-ready |
| Document Type | Must use controlled values |
| Processing Status | Must use controlled values |
| Language | Should use stable language codes where possible |
| Country | Should use stable country codes where possible |
| Currency | Should use stable currency codes where possible |

## Domain Event Rules

Domain events describe important business changes.

Rules:

1. Events should use past-tense names.
2. Events should include the aggregate ID.
3. Events should include timestamp and actor where available.
4. Events should include source references when created from documents or AI.
5. Events should be designed before they are persisted.
6. Sprint 1 events may exist conceptually before a durable event store exists.

## AI Runtime Relationship

AI Runtime should receive domain objects when possible.

Instead of sending raw document text alone, workflows should prepare structured context:

- Project;
- Document;
- Document Version;
- BOQ Items;
- Extracted Entities;
- Previous Knowledge;
- Review Items;
- Workflow Stage.

AI results should map back into domain objects, confidence scores and review items.

## Knowledge Graph Relationship

The Knowledge Graph depends on the Domain Model.

Knowledge nodes and edges should reference domain entities such as projects, documents, extracted entities, product requirements, products, suppliers and quotes. Knowledge must remain linked to source evidence and verification state.

## Database Implications

This document does not require immediate database migrations.

Current implementation can use existing tables while new domain concepts are introduced gradually. The domain model should guide naming, typing and future schema design, but it does not require replacing current storage.

## API Implications

APIs should expose stable domain concepts instead of leaking database implementation details.

New code should use typed domain models before adding new persistence tables. API contracts should be shaped around project intelligence and procurement language.

## Future Migration Strategy

Domain concepts should be introduced in layers:

1. typed application models;
2. UI and workflow terminology;
3. processing and AI context objects;
4. domain events;
5. persistence tables or event store when the workflow requires it.

Domain events should be designed first, persisted later.

## Sprint 1 Scope

Sprint 1 remains focused on Project Intelligence.

Supplier database, RFQ automation, marketplace, purchase orders, payments and procurement execution remain out of scope for Sprint 1.

## Acceptance Criteria

| Criteria | Requirement |
| --- | --- |
| Shared language | New engineering work uses documented domain names |
| Typed models first | New workflows introduce typed domain models before new persistence tables |
| AI compatibility | AI context and results can reference domain objects |
| Knowledge compatibility | Knowledge nodes and edges can link to source evidence |
| Version-ready | Domain objects are designed with future revisions in mind |
| No forced migration | Existing tables can continue to support current functionality |
