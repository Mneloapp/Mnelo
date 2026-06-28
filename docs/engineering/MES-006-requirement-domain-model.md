# MES-006 — Requirement Domain Model

## Purpose

This document defines Requirement as the central domain entity of Mnelo.

MES-005 introduced the Requirement Engine as the bridge between BOQ understanding, tender pricing, RFQ, procurement and delivery. MES-006 goes deeper and defines the domain model around Requirements.

BOQ rows are source data. Requirements are living business objects. A Requirement is the stable object that connects tender estimation, RFQ, supplier quotes, BOQ pricing, tender submission, awarded project procurement, purchase orders, delivery and knowledge.

Requirement is not a procurement-only object. It starts during tender stage and continues if the project is awarded.

## Core Principle

Requirement is the backbone of Mnelo.

Everything important connects to a Requirement:

- Source BOQ rows
- Specifications
- Drawings
- RFQ lines
- Supplier quotes
- Selected price
- Tender output
- Purchase orders
- Delivery status
- Knowledge

The BOQ may be the format users upload or submit, but Requirements are the durable business objects Mnelo manages.

## Requirement Identity

Every Requirement must have a stable identity.

| Field | Description |
| --- | --- |
| `requirement_id` | Stable unique identifier for the Requirement. |
| `project_id` | Project that owns the Requirement. |
| `requirement_number` | Human-readable project sequence or reference number. |
| `normalized_identity` | Normalized identity used for deduplication and matching. |
| `version` | Current Requirement version number. |
| `created_at` | Creation timestamp. |
| `updated_at` | Last update timestamp. |

Requirement identity must remain stable even when source BOQ rows change, prices change, or workflow stage changes.

## Requirement Entity

| Field | Description |
| --- | --- |
| `requirement_id` | Stable Requirement identifier. |
| `project_id` | Owning project. |
| `name` | Human-readable requirement name. |
| `normalized_name` | Normalized product/work name. |
| `description` | Consolidated business description. |
| `system` | System or discipline. |
| `category` | Category grouping. |
| `subcategory` | Specific subcategory. |
| `unit` | Unit of measure. |
| `total_quantity` | Consolidated quantity. |
| `technical_specification` | Technical details, standards, ratings or constraints. |
| `normalized_identity` | Matching key for consolidation and memory. |
| `stage` | Current lifecycle stage. |
| `status` | Current condition or required action. |
| `confidence` | Confidence in classification/consolidation. |
| `needs_review` | Whether human review is required. |
| `selected_supplier_id` | Supplier selected for pricing/procurement, when available. |
| `selected_quote_id` | Quote selected for pricing/procurement, when available. |
| `selected_unit_price` | Selected unit price. |
| `selected_currency` | Currency of selected unit price. |
| `total_estimated_amount` | Calculated total amount. |
| `created_at` | Creation timestamp. |
| `updated_at` | Last update timestamp. |

## Requirement Source

Requirement must preserve traceability to all source data.

| Field | Description |
| --- | --- |
| `requirement_source_id` | Stable identifier for the source link. |
| `requirement_id` | Requirement connected to the source. |
| `source_type` | Source type. |
| `source_id` | Generic source identifier. |
| `source_file_id` | Uploaded file identifier when available. |
| `boq_item_id` | BOQ item identifier when source is a BOQ row. |
| `sheet_name` | Excel sheet or source section. |
| `row_number` | Source row number. |
| `original_description` | Raw source text. |
| `quantity` | Source quantity. |
| `unit` | Source unit. |
| `source_confidence` | Confidence that the source belongs to the Requirement. |

Source types:

- `boq_item`
- `specification`
- `drawing`
- `addendum`
- `email`
- `manual`

## Requirement Version

Requirements are versioned.

Versioning is required because:

- Tender documents change.
- Addendums arrive.
- BOQ is revised.
- User corrections happen.
- Supplier prices change.

| Field | Description |
| --- | --- |
| `requirement_version_id` | Stable version identifier. |
| `requirement_id` | Requirement being versioned. |
| `version_number` | Sequential version number. |
| `change_type` | Type of change. |
| `changed_by` | User, system or agent that made the change. |
| `change_reason` | Explanation of the change. |
| `snapshot` | Requirement snapshot at this version. |
| `created_at` | Version creation timestamp. |

## Requirement Lifecycle

Lifecycle stages:

- `imported`
- `understood`
- `needs_review`
- `ready_for_rfq`
- `rfq_sent`
- `quoted`
- `priced`
- `submitted`
- `awarded`
- `procurement`
- `ordered`
- `delivered`
- `closed`
- `cancelled`

## Requirement Status vs Stage

Stage describes where the Requirement is in the business workflow.

Status describes the current condition or action needed.

Examples:

| Stage | Status | Meaning |
| --- | --- | --- |
| `tender` | `needs_review` | Requirement exists during tender review but needs human decision. |
| `rfq` | `awaiting_quotes` | Requirement was sent to suppliers and is waiting for responses. |
| `procurement` | `ordered` | Requirement is in procurement and has been ordered. |

## Requirement Events

Domain events:

- `RequirementCreated`
- `RequirementUpdated`
- `RequirementMerged`
- `RequirementSplit`
- `RequirementNeedsReview`
- `RequirementApproved`
- `RequirementSentToRFQ`
- `RequirementQuoteReceived`
- `RequirementPriceSelected`
- `RequirementWrittenBackToBOQ`
- `RequirementAwarded`
- `RequirementConvertedToProcurement`
- `RequirementOrdered`
- `RequirementDelivered`
- `RequirementClosed`

Events make Requirement changes auditable and allow future workflows to react without tightly coupling features.

## Requirement Consolidation

Multiple BOQ rows may become one Requirement if they represent the same purchasing need.

Consolidate only if:

- System/category/subcategory match.
- Normalized identity matches.
- Technical specification does not conflict.
- Unit matches.

Do not consolidate if:

- Dimension differs.
- Rating differs.
- Material differs.
- Voltage differs.
- Wattage differs.
- Color temperature differs.
- Cable size differs.
- Diameter differs.
- Model differs.
- Standard differs.

If uncertain:

- Create separate Requirements.
- Mark `needs_review`.

## Requirement Split

A Requirement may need to split if later information shows different specifications.

Example:

`LED Panel 600x600` appears as one group.

Later the user identifies:

- `4000K`
- `6000K`

Then one Requirement becomes two Requirements.

Splitting must preserve source rows, history, decisions and audit trail.

## Requirement Merge

Two Requirements may merge if the user confirms they are the same purchasing need.

Merge must preserve:

- All source rows
- History
- Quantities
- Decisions
- Audit trail

No merge should silently discard evidence or prior decisions.

## Relationship With RFQ

RFQ lines are generated from Requirements.

RFQ should not be generated directly from BOQ rows.

RFQ line fields:

| Field | Description |
| --- | --- |
| `requirement_id` | Requirement being requested. |
| `requested_quantity` | Quantity requested from suppliers. |
| `technical_specification` | Technical requirement sent to suppliers. |
| `preferred_brand` | Preferred brand when specified. |
| `acceptable_alternatives` | Whether alternatives are allowed and under what conditions. |
| `required_documents` | Datasheets, compliance documents, certificates or schedules required. |
| `delivery_location` | Required delivery location. |

## Relationship With Quotes

Supplier quotes attach to Requirements.

Quote line fields:

| Field | Description |
| --- | --- |
| `requirement_id` | Requirement being quoted. |
| `supplier_id` | Supplier providing the quote. |
| `offered_product` | Offered product or service. |
| `offered_brand` | Offered brand/manufacturer. |
| `unit_price` | Supplier unit price. |
| `currency` | Quote currency. |
| `lead_time` | Delivery or availability lead time. |
| `validity` | Quote validity period. |
| `compliance_status` | Compliance with the Requirement. |
| `notes` | Supplier or reviewer notes. |

## Relationship With Tender BOQ Writeback

Requirement pricing must be able to fill the original BOQ format.

Original BOQ rows remain the tender output format. Requirement selected prices are mapped back to BOQ rows through Requirement Sources.

Each BOQ row should receive:

- Selected unit price
- Selected total amount
- Supplier reference
- Quote reference
- Pricing confidence

This allows Mnelo to operate around Requirements while still producing the tender documents users need to submit.

## Relationship With Awarded Procurement

If a project is awarded, Requirements do not get recreated.

They move into procurement stage.

Procurement actions continue from the same Requirement identity. This preserves tender decisions, pricing history, source traceability and audit continuity.

## Relationship With Knowledge Graph

Every verified Requirement becomes knowledge.

Knowledge links:

- Similar future requirements
- Product intelligence
- Supplier performance
- Pricing history
- Lead time history

The Knowledge Graph should help Mnelo recognize similar future Requirements and recommend better RFQ, pricing and procurement decisions.

## Requirement Decision Rules

Important rules:

- Never lose source traceability.
- Never overwrite user decisions silently.
- Never merge uncertain Requirements automatically.
- AI recommendations must be explainable.
- Requirement identity must survive workflow transitions.
- BOQ is an input/output format, not the main domain object.

## Implementation Notes

This document does not require immediate database implementation.

Initial code can create in-memory or derived Requirement candidates from existing `boq_items`.

Future implementation may introduce:

- `requirements`
- `requirement_sources`
- `requirement_versions`
- `requirement_events`
- `requirement_quotes`
- `requirement_price_selections`

The first implementation should preserve the current BOQ parsing and classification workflow while introducing Requirements as a derived domain layer.

## Acceptance Criteria For Future Implementation

- BOQ rows can be consolidated into Requirements.
- Requirement preserves all source rows.
- Requirement can receive supplier quote data.
- Requirement can write selected prices back to original BOQ rows.
- Requirement can move from tender to procurement without being recreated.
- Requirement history is auditable.
