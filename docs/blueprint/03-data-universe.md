# Data Universe

## Overview

Mnelo’s product architecture is built around construction procurement knowledge. Data must be structured enough for automation and explainable enough for human review.

## Core Data Domains

| Domain | Description | Examples |
| --- | --- | --- |
| Project | Commercial and technical workspace for a tender or active job | name, client, location, industry, notes |
| Document | Uploaded project file | BOQ Excel, specification PDF, drawing PDF, tender addendum |
| BOQ Item | Parsed procurement or scope row | description, quantity, unit, rate, amount |
| Entity | Extracted object from documents | product, system, material, manufacturer, model, standard |
| Classification | System/category/subcategory assignment | HVAC → Air Distribution → Ductwork |
| Knowledge | Verified reusable fact or decision | “This description maps to Ductwork” |
| Supplier | Company that can quote or supply items | contractor, distributor, manufacturer |
| RFQ | Package sent to suppliers | line items, documents, due date, supplier list |
| Quote | Supplier response | price, lead time, exclusions, validity |
| Estimate | Commercial output | cost, markup, margin, alternates |
| Procurement | Purchasing execution | approvals, orders, delivery tracking |

## Knowledge Sources

Mnelo knowledge can originate from:

1. Uploaded documents.
2. Parsed BOQ rows.
3. AI classification.
4. User corrections.
5. Confirmed correct classifications.
6. Supplier responses.
7. Quote comparisons.
8. Historical project decisions.

## Data Quality Requirements

| Requirement | Meaning |
| --- | --- |
| Preserve raw data | Original document text and BOQ rows must not be silently deleted or rewritten |
| Track confidence | AI and rules-based outputs require confidence scores |
| Explain decisions | Every automated decision needs a reason and source |
| Support review | Low-confidence data must enter a review queue |
| Keep history | Documents, entities and knowledge must support versioning |
| Enable reuse | Verified knowledge must improve future projects |

## Canonical Flow

```text
Raw Document
→ Parsed Content
→ Extracted Entities
→ Classified Knowledge
→ Human Review
→ Verified Knowledge
→ Reusable Procurement Intelligence
```

## Non-Negotiable Rule

Mnelo must never treat unverified AI output as permanent truth. AI output becomes reliable knowledge only through confidence, source traceability and human confirmation where required.
