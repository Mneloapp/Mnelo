# MES-007 — Requirement Workflow Engine

## Purpose

This document defines how a Requirement lives inside Mnelo from tender stage to procurement and delivery.

MES-005 introduced the Requirement Engine as the bridge between BOQ understanding, tender pricing, RFQ, procurement and delivery. MES-006 defined Requirement as Mnelo's core domain object. MES-007 defines how that Requirement moves through the business workflow.

A Requirement is a living business object. It changes workflow state. It never changes identity.

## Why Requirement Workflow Exists

Mnelo must support the full Tender-to-Procurement lifecycle.

A Requirement should not be recreated when the project moves from tender pricing to awarded procurement. The same Requirement identity must connect:

- Tender estimation
- RFQ
- Supplier quotes
- BOQ writeback
- Procurement
- Purchase orders
- Delivery

Without a formal workflow model, the platform risks creating disconnected objects for tender, pricing, supplier quotes and procurement. That would break traceability, duplicate work and prevent Mnelo from learning across the full project lifecycle.

The Requirement Workflow Engine makes Requirements durable across stages while allowing each stage to expose the right view and actions.

## Core Workflow

```text
Tender Documents
→ AI Understanding
→ Requirement Created
→ Requirement Review
→ Ready For RFQ
→ RFQ Sent
→ Quotes Received
→ Quote Comparison
→ Price Selected
→ Original BOQ Filled
→ Tender Submitted
→ Project Awarded
→ Convert To Procurement
→ Purchase Order
→ Delivery
→ Closed
```

## Requirement Lifecycle Stages

| Stage | Meaning |
| --- | --- |
| `draft` | Requirement is being created or prepared. |
| `imported` | Requirement was imported from source data such as BOQ, specification or drawing. |
| `understood` | Mnelo has extracted and interpreted the Requirement with sufficient structure. |
| `needs_review` | Human review is required before the Requirement can progress. |
| `ready_for_rfq` | Requirement is approved and ready to be sent to suppliers. |
| `rfq_sent` | Requirement has been included in an RFQ package. |
| `quoted` | One or more supplier quotes have been received. |
| `priced` | A price has been selected or prepared for tender pricing. |
| `submitted` | Requirement pricing has been included in submitted tender output. |
| `awarded` | Project or scope has been awarded. |
| `procurement` | Requirement is active in procurement execution. |
| `ordered` | A purchase order has been created for the Requirement. |
| `delivered` | Required goods or services have been delivered. |
| `closed` | Requirement is complete and retained for history and knowledge. |
| `cancelled` | Requirement is no longer active. |

## Requirement Actions

| Action | Purpose |
| --- | --- |
| `review_requirement` | Review extracted or changed Requirement details. |
| `approve_requirement` | Approve the Requirement for the next workflow stage. |
| `request_quotes` | Include the Requirement in an RFQ request. |
| `receive_quotes` | Attach supplier quote responses to the Requirement. |
| `compare_quotes` | Compare supplier offers for the Requirement. |
| `select_price` | Select a price for tender or procurement use. |
| `write_back_to_boq` | Write selected pricing back to original BOQ rows. |
| `submit_tender` | Include the Requirement in tender submission output. |
| `convert_to_procurement` | Move the Requirement from tender stage into procurement execution. |
| `create_purchase_order` | Create or attach a purchase order for the Requirement. |
| `update_delivery` | Update delivery status and related evidence. |
| `close_requirement` | Mark the Requirement complete. |
| `cancel_requirement` | Cancel the Requirement while preserving history. |

## State Transition Rules

Valid transitions define how Requirements can move through the workflow.

| From | To | Notes |
| --- | --- | --- |
| `draft` | `imported` | Requirement is created from source material. |
| `imported` | `understood` | AI or user has structured the Requirement. |
| `understood` | `needs_review` | Low confidence, missing data or conflict requires review. |
| `understood` | `ready_for_rfq` | Requirement is sufficiently complete without review. |
| `needs_review` | `ready_for_rfq` | Human approves or corrects the Requirement. |
| `ready_for_rfq` | `rfq_sent` | Requirement is sent to suppliers. |
| `rfq_sent` | `quoted` | Supplier quote response is received. |
| `quoted` | `priced` | Quote comparison and price selection are complete. |
| `priced` | `submitted` | Pricing is written into tender output and submitted. |
| `submitted` | `awarded` | Project or scope is awarded. |
| `awarded` | `procurement` | Requirement enters procurement execution. |
| `procurement` | `ordered` | Purchase order is created. |
| `ordered` | `delivered` | Delivery is confirmed. |
| `delivered` | `closed` | Requirement is complete. |

Invalid transitions should be rejected or require explicit administrative recovery.

Do not allow:

- `closed` → `rfq_sent`
- `cancelled` → `ordered`
- `procurement` → `draft`

Cancellation may be allowed from active stages when the user provides a reason and the system records an event.

## Requirement Events

Every transition must create an event.

Domain events:

- `RequirementCreated`
- `RequirementImported`
- `RequirementUnderstood`
- `RequirementReviewRequired`
- `RequirementApproved`
- `RequirementReadyForRFQ`
- `RequirementRFQSent`
- `RequirementQuoteReceived`
- `RequirementQuotesCompared`
- `RequirementPriceSelected`
- `RequirementWrittenBackToBOQ`
- `RequirementTenderSubmitted`
- `RequirementAwarded`
- `RequirementConvertedToProcurement`
- `RequirementPurchaseOrderCreated`
- `RequirementDeliveryUpdated`
- `RequirementClosed`
- `RequirementCancelled`

Events must include enough context to explain what changed, who or what changed it, when it happened and which source evidence or decision caused the transition.

## Requirement Views

Requirement is one object but can be shown through different views.

| View | Purpose |
| --- | --- |
| Tender View | Shows Requirements as tender estimation work. |
| BOQ Pricing View | Maps Requirement pricing back to the original BOQ output format. |
| RFQ View | Shows Requirements as supplier request lines. |
| Supplier Quote View | Shows supplier responses attached to Requirements. |
| Procurement View | Shows awarded Requirements moving through ordering and delivery. |
| Delivery View | Shows fulfillment status and delivery evidence. |
| Management View | Shows workflow health, blockers, value and risk. |

Each view must read the same Requirement identity. Views may hide or emphasize different fields, but they must not create separate business objects for the same need.

## Human Approval Rules

AI may recommend. Humans approve.

Human approval is required for:

- Final RFQ send
- Selected supplier price
- BOQ writeback
- Tender submission
- Purchase order creation
- Requirement cancellation

These approvals must be auditable. The system should record the user, timestamp, decision, source context and any AI recommendation that influenced the action.

## AI Responsibilities

AI supports the workflow by stage. It should accelerate decisions without silently owning high-risk actions.

### AI Understanding

- Extract requirement candidates.
- Classify system/category/subcategory.
- Identify missing specifications.

### RFQ

- Prepare supplier-ready descriptions.
- Suggest package grouping.

### Quotes

- Compare prices.
- Identify incomplete offers.
- Detect non-compliance.

### BOQ Writeback

- Map selected prices back to original BOQ rows.

### Procurement

- Detect delays.
- Compare ordered quantity against required quantity.

AI output must include confidence, explanation and source references when it affects workflow movement.

## Relationship With Original BOQ

The original BOQ remains an output format.

Requirement is the internal operating object.

BOQ writeback uses Requirement Sources to fill supplier price, unit rate and total amount back into the original format.

This means Mnelo can preserve the client's required BOQ format while operating internally around durable Requirements. BOQ rows remain source evidence and output targets. They do not own the workflow.

## Relationship With Procurement

If the tender is awarded, Requirements move into procurement.

They are not recreated.

Procurement continues from the same Requirement identity. This allows awarded procurement to inherit:

- Tender decisions
- Supplier quote history
- Selected prices
- Technical clarifications
- Source BOQ traceability
- Review history
- Knowledge created during estimation

## Requirement Workflow Rules

- Requirement identity must never change.
- Every important transition creates an event.
- AI cannot silently advance high-risk stages.
- User decisions override AI suggestions.
- BOQ rows are source evidence, not the workflow owner.
- Requirement can be split or merged, but history must be preserved.

## Implementation Notes

No immediate database implementation is required.

Future implementation may introduce:

- `requirement_events`
- `requirement_state_transitions`
- `requirement_actions`
- `requirement_workflow_history`

Initial implementation can be derived from existing BOQ items and project state.

The first code implementation should prefer typed domain models and derived workflow state before creating additional persistence tables. Durable database tables should be introduced when the workflow begins producing user-visible decisions that must be audited.

## Acceptance Criteria For Future Implementation

- A Requirement can move from tender to procurement without being recreated.
- Every state transition is auditable.
- BOQ prices can be written back from selected Requirement pricing.
- RFQ and Quote workflows attach to Requirements, not raw BOQ rows.
- Procurement orders attach to Requirements.
- Closed Requirements retain full history.
