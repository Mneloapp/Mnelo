# MES-010 — Procurement Package Architecture

## Purpose

This document defines Procurement Package as Mnelo's commercial workflow object.

## Core Principle

Requirements are permanent.

Packages are dynamic.

Requirements represent what the project needs.

Packages represent how those Requirements are commercially executed.

A Requirement may belong to different Packages during different workflow stages.

Packages never own business truth.

Requirements own business truth.

## 1. Why Procurement Packages Exist

Suppliers never receive thousands of BOQ rows.

They receive commercial packages.

Packages exist to optimize:

- RFQs
- Supplier communication
- Quote comparison
- Procurement execution

Packages translate stable project Requirements into practical commercial workflows that suppliers, procurement teams and project teams can act on.

## 2. Requirement vs Package

```text
Requirement
↓
Business Need

Package
↓
Commercial Strategy
```

Requirement never changes identity.

Package may change multiple times.

The same Requirement can move through different Packages as the project moves from tender pricing to awarded procurement and delivery.

## 3. Package Identity

| Field | Description |
| --- | --- |
| `package_id` | Stable identifier for the Package. |
| `project_id` | Project that owns the Package. |
| `package_name` | Human-readable Package name. |
| `package_type` | Package strategy or grouping type. |
| `workflow_stage` | Current workflow stage for the Package. |
| `created_at` | Creation timestamp. |
| `updated_at` | Last update timestamp. |

Package identity supports commercial execution, but it does not replace Requirement identity.

## 4. Package Types

Supported Package types may include:

- System Package
- Supplier Package
- Building Package
- Floor Package
- Phase Package
- Trade Package
- Custom Package
- AI Suggested Package

Package types describe why Requirements were grouped together.

## 5. Package Membership

A Package contains Requirements.

A Requirement may belong to multiple Packages during its lifecycle.

Example:

```text
Tender Package
↓
Awarded Package
↓
Construction Package

Same Requirement.
Different Package.
```

Package membership must preserve traceability back to each Requirement.

## 6. Package Lifecycle

```text
Draft
↓
AI Suggested
↓
User Reviewed
↓
Approved
↓
RFQ Ready
↓
RFQ Sent
↓
Quotes Received
↓
Quote Compared
↓
Supplier Selected
↓
Procurement Package
↓
Purchase Orders
↓
Completed
```

The Package lifecycle describes the commercial execution path. It does not change the lifecycle identity of the Requirements inside the Package.

## 7. Package Actions

Package actions may include:

- Create Package
- Merge Packages
- Split Package
- Generate RFQ
- Assign Suppliers
- Receive Quotes
- Compare Quotes
- Select Winner
- Convert To Procurement
- Archive

Every Package action that affects Requirement execution should preserve audit history and Requirement traceability.

## 8. AI Responsibilities

AI may support Package creation and optimization by helping teams:

- Suggest package grouping.
- Detect duplicate packages.
- Recommend package optimization.
- Identify package risks.
- Estimate package value.
- Suggest supplier specialization.

AI package recommendations must be explainable. Human approval is required before supplier-facing actions.

## 9. Package Consolidation Rules

Requirements may enter the same Package only when commercially appropriate.

Examples:

- Lighting Package
- Containment Package
- Fire Alarm Package
- HVAC Equipment Package

Never merge purely because descriptions are similar.

Commercial intent comes first.

Package grouping should consider supplier capability, delivery strategy, technical compatibility and procurement risk.

## 10. Package Split Rules

Split when:

- Different suppliers
- Different lead times
- Different project phases
- Different buildings
- Different procurement strategy
- Different specifications

Package splitting should reduce commercial risk or improve execution clarity without changing the underlying Requirement identity.

## 11. Package Merge Rules

Merge only when:

- Commercial strategy is identical.
- Supplier strategy matches.
- Delivery strategy matches.
- Risk profile matches.

Merged Packages must preserve all Requirement memberships, history, quote references and supplier communication evidence.

## 12. Relationship With RFQ

RFQs are generated from Packages.

Not directly from Requirements.

```text
Package
↓
RFQ
↓
Supplier
```

The Package defines the supplier-facing commercial scope. Requirements provide the underlying source of truth and line-level traceability.

## 13. Relationship With Quotes

Quotes belong to Packages.

Quote lines map back to Requirements.

Requirement pricing updates from selected quotes.

This allows Mnelo to compare supplier responses at Package level while still updating pricing and procurement decisions at Requirement level.

## 14. Relationship With BOQ Writeback

Selected Requirement prices fill original BOQ rows.

Package itself never writes into BOQ.

Requirements do.

Packages may influence which supplier prices are selected, but BOQ writeback must happen through Requirement Sources.

## 15. Relationship With Procurement

After award, Tender Packages become Procurement Packages.

Requirement identities remain unchanged.

Procurement can continue from the same Requirements while the Package shifts from pricing strategy to purchasing execution.

## 16. Package Views

One Package can be presented through different views:

- Tender Packaging
- Supplier Packaging
- Construction Packaging
- Procurement Packaging
- Management Packaging

Same Package.

Different View.

Views may emphasize different Package fields, but they must not duplicate Package or Requirement truth.

## 17. Design Rules

- Packages are temporary.
- Requirements are permanent.
- Packages never replace Requirements.
- Packages exist to organize commercial workflows.
- Packages preserve Requirement traceability.

## 18. Future Implementation

Potential tables:

- `requirement_packages`
- `package_requirements`
- `package_quotes`
- `package_suppliers`
- `package_events`

Do not implement these tables until a Development Order explicitly requests implementation.

## 19. Acceptance Criteria

- Requirements can be grouped into Packages.
- Packages can generate RFQs.
- Packages preserve Requirement links.
- Requirements survive Package changes.
- Procurement continues without recreating Requirements.
