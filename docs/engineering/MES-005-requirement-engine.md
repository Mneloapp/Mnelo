# MES-005 — Requirement Engine

## Purpose

This document defines the Mnelo Requirement Engine as the core bridge between tender estimation, RFQ, supplier pricing, award, procurement, purchase orders and delivery.

BOQ rows are source data. Requirements are the business objects Mnelo manages.

A Requirement represents what the project needs, regardless of where that need came from:

- BOQ row
- Specification
- Drawing
- Addendum
- Email
- Manual user input

The Requirement remains the same while its workflow stage changes.

## Why Requirement Engine Exists

Mnelo should not treat BOQ rows as final procurement objects.

BOQ rows are raw inputs. They are often duplicated, split across sheets, incomplete, inconsistent or formatted for tender submission rather than procurement execution. Tender pricing, RFQ, procurement and delivery should all be organized around Requirements.

The Requirement Engine turns source rows and project evidence into consolidated, traceable project needs. This allows Mnelo to preserve the original tender structure while also creating a clean operational layer for pricing, sourcing and procurement.

## Core Workflow

```text
Tender Package
→ AI Understanding
→ Requirements
→ RFQ
→ Supplier Quotes
→ Tender Pricing
→ Tender Submission
→ Project Award
→ Procurement
→ Purchase Orders
→ Delivery
```

## Core Entity: Requirement

| Field | Description |
| --- | --- |
| `requirement_id` | Stable identifier for the consolidated requirement. |
| `project_id` | Project that owns the requirement. |
| `name` | Human-readable requirement name. |
| `normalized_name` | Normalized product or work identity used for grouping. |
| `system` | Project system or discipline. |
| `category` | Procurement/category grouping. |
| `subcategory` | More specific classification. |
| `description` | Consolidated description for review, RFQ and procurement. |
| `technical_specification` | Important technical requirements, standards, ratings or constraints. |
| `unit` | Unit of measure for consolidated quantity. |
| `total_quantity` | Aggregated quantity across source rows that are safe to consolidate. |
| `stage` | Current workflow stage. |
| `status` | Operational status within the current stage. |
| `source_rows` | Traceable source evidence that produced this requirement. |
| `confidence` | Confidence score for consolidation and classification. |
| `needs_review` | Whether a human must review the requirement before continuing. |
| `created_at` | Creation timestamp. |
| `updated_at` | Last update timestamp. |

## Requirement Stage

| Stage | Meaning |
| --- | --- |
| `tender` | Requirement was discovered during tender understanding. |
| `rfq` | Requirement is being prepared for supplier quotation. |
| `quoted` | Supplier quotes have been received. |
| `priced` | Requirement has pricing selected or calculated. |
| `submitted` | Requirement pricing has been included in tender submission. |
| `awarded` | Project was awarded and the requirement is active for execution. |
| `procurement` | Requirement is being prepared for purchase. |
| `ordered` | Requirement has been ordered. |
| `delivered` | Requirement has been delivered. |
| `closed` | Requirement workflow is complete. |

## Requirement Status

| Status | Meaning |
| --- | --- |
| `draft` | Initial requirement candidate. |
| `needs_review` | Requires human review before continuing. |
| `ready_for_rfq` | Ready to be included in RFQ packages. |
| `awaiting_quotes` | Sent to suppliers and waiting for responses. |
| `quoted` | At least one supplier quote exists. |
| `selected` | Preferred quote or supplier has been selected. |
| `ordered` | Purchase order or purchase action exists. |
| `delivered` | Delivery is complete. |
| `cancelled` | Requirement is no longer needed. |

## Source Traceability

Every consolidated Requirement must preserve links back to original BOQ rows, sheets, files, drawings or specifications.

Source row fields:

| Field | Description |
| --- | --- |
| `boq_item_id` | Source BOQ item row identifier. |
| `source_file_id` | Uploaded file where the source row came from. |
| `sheet_name` | Excel sheet or document section. |
| `row_number` | Source row number when available. |
| `original_description` | Raw source description. |
| `quantity` | Raw source quantity. |
| `unit` | Raw source unit. |
| `source_type` | Source category, such as BOQ, specification, drawing, addendum, email or manual input. |

Traceability is mandatory because Mnelo must later fill tender BOQs, explain pricing decisions and support procurement audits.

## Consolidation Rules v1

Requirements may be grouped only when all of the following are true:

- System matches.
- Category matches.
- Subcategory matches.
- Normalized product identity matches.
- Unit matches.
- Technical specification does not conflict.

Do not merge when any of the following differ:

- Size
- Voltage
- Wattage
- Color temperature
- Cable size
- Diameter
- Material
- Model
- Standard

If uncertain:

- Do not merge.
- Set `needs_review = true`.

## Relationship With BOQ

| Concept | Role |
| --- | --- |
| BOQ Item | Source row extracted from a tender document. |
| Requirement | Consolidated project need. |
| RFQ Line | Supplier request based on a requirement. |
| Quote Line | Supplier response to an RFQ line. |
| Purchase Line | Actual ordered requirement after award/procurement. |

BOQ items remain important evidence and export targets, but Requirements become the operational objects that move through Mnelo workflows.

## Relationship With Tender Pricing

The Requirement Engine must support filling the original BOQ format after supplier pricing is received.

The original BOQ should remain exportable with:

- Supplier price
- Selected unit rate
- Total amount
- Pricing source
- Quote reference

This means Requirements must preserve enough source mapping to push pricing back into the tender structure without losing traceability.

## Relationship With Procurement

If a project is awarded, the same Requirements move from tender/pricing stage into procurement stage.

No duplicate workflow should be created. The Requirement should keep its identity and history while its stage changes from tender work to execution work.

## Relationship With Learning Memory

Manual classification and learned mappings help the Requirement Engine normalize similar rows into consistent requirements.

Learning memory can improve:

- System/category/subcategory consistency
- Normalized product identity
- Duplicate detection
- Review prioritization
- Future RFQ package creation

Learning memory must support the Requirement Engine, but it must not override source traceability or human review rules.

## First Implementation Scope

Requirement Engine v1 should only:

- Read existing `boq_items`.
- Consolidate them into requirement candidates.
- Preserve source rows.
- Show consolidated quantity.
- Mark uncertain groups as `needs_review`.

Out of scope for v1:

- RFQ sending
- Supplier matching
- Quote comparison
- Purchase orders
- Delivery tracking
- Automatic BOQ export writing

## Future Scope

- RFQ packages
- Supplier quote intake
- Tender BOQ auto-fill
- Awarded project procurement
- Purchase orders
- Delivery tracking
- Cost intelligence

## Acceptance Criteria For Future Implementation

- Same items across multiple sheets can consolidate.
- Source traceability is preserved.
- Different specifications do not merge.
- Requirements can later receive supplier quote data.
- Original BOQ can later be filled back from requirement pricing.
