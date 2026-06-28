# Sprint 1 — Project Intelligence Engine

## Mission

Transform uploaded project documents into structured, explainable and reusable knowledge.

## Business Goal

Users upload an entire tender package. Mnelo understands the project. It creates structured project knowledge.

## Success Metrics

| Metric | Target |
| --- | --- |
| Document classification | 95%+ |
| BOQ entity extraction | 90%+ |
| Document retention | No lost documents |
| Low-confidence handling | Review Queue for low confidence |

## Included

- Project Workspace
- Upload Engine
- Document Intelligence Agent
- Entity Extraction
- Review Queue
- Knowledge Engine

## Excluded

- Supplier Database
- Marketplace
- RFQ
- Quote Comparison
- Purchase Orders
- Payments
- Negotiation

## Implementation Order

1. Database Schema
2. Processing Queue
3. Upload Engine
4. Document Intelligence Agent
5. Entity Extraction
6. Review Queue
7. Knowledge Engine
8. Dashboard
9. Testing
10. Refactoring

## Delivery Notes

Sprint 1 must prioritize correctness, traceability and reviewability over automation. The output should create the foundation for RFQ automation, supplier intelligence and quote comparison.

## Delivery Updates

### Deliverable 2 — Processing Pipeline Foundation

Deliverable 2 introduced the first project-level processing pipeline foundation. The Project Workspace can now display document processing items with status, stage, confidence, errors and timestamp. Until dedicated processing job records exist, the pipeline view is safely derived from existing uploaded project files and parsed BOQ state.

### Deliverable 4 — Project Workspace Information Architecture

Deliverable 4 split Project Workspace into route-based sections to reduce information overload.

### BOQ Review Taxonomy Update

Added Junction Box taxonomy support and BOQ Review guidance.

### Classification Rules Update

Improved rules-first electrical subcategory detection while preserving Needs Review for ambiguous items.

Fixed classification precedence so weak Excel context no longer blocks strong row-description rules, and strengthened manual correction preservation during reparse.

Added durable manual classification memory outside parsed BOQ rows so user corrections can survive reparse even when `boq_items` rows are recreated.

Manual classification corrections are persistent and must survive re-parse. User-confirmed rows use `classification_source = user` and `user_corrected = true`.

Re-parse restore now matches manual corrections by file, sheet, normalized description, unit and quantity instead of row IDs.

Manual corrections now also create reusable classification learning memory, so verified system/category/subcategory decisions can be reused across future projects before rules or AI run.

Reparse now reads verified classification learning memory before fallback classification, preventing learned subcategories from being replaced by Needs Review.

Requirement Engine architecture was introduced as the bridge between BOQ understanding, tender pricing, RFQ and procurement.

MES-006 introduced Requirement as Mnelo’s core domain object and defined the Requirement lifecycle, source traceability, versioning and relationship to RFQ, quotes, tender BOQ writeback and procurement.

MES-007 defined the Requirement Workflow Engine and formalized the Tender-to-Procurement lifecycle around stable Requirement identity.

MES-009 introduced Requirement Views Architecture and established one Requirement with multiple business perspectives.

MES-010 introduced Procurement Package Architecture and established Packages as dynamic commercial workflow objects built on stable Requirements.

Design Order #001 introduced a UI prototype for Requirement Workspace using existing BOQ data as source evidence.

Manual classification UX was improved and Apply to Similar Items was made review-first and conservative.
