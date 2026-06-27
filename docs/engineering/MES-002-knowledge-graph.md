# MES-002 — Knowledge Graph

## Status

Proposed

## Objective

The Mnelo Knowledge Graph connects project documents, BOQ items, extracted entities, classifications, suppliers, quotes and decisions into reusable procurement intelligence.

## Node Types

| Node Type | Description |
| --- | --- |
| Project | Construction tender or active job |
| Document | Uploaded file or document revision |
| BOQ Item | Parsed line item from a BOQ |
| Entity | Extracted product, system, material or specification |
| System | High-level discipline or package group |
| Category | Procurement category within a system |
| Supplier | Company that can quote or supply items |
| Manufacturer | Product maker or specified brand |
| RFQ | Supplier request package |
| Quote | Supplier response |
| Knowledge | Verified fact or reusable decision |
| User Decision | Confirmation, correction or rejection by a user |

## Relationship Types

| Relationship | Meaning |
| --- | --- |
| belongs_to_project | Document, BOQ item or RFQ belongs to a project |
| extracted_from | Entity or BOQ item came from a document |
| classified_as | BOQ item maps to system/category/subcategory |
| confirmed_by | Knowledge was confirmed by a user |
| corrected_from | User correction changed an AI or rules-based output |
| supplied_by | Supplier can supply a category or product |
| quoted_in | Item or package appears in a quote |
| supersedes | New document or entity version replaces an older version |
| similar_to | Entity resembles another known entity |

## Confidence Levels

| Level | Range | Meaning |
| --- | --- | --- |
| Low | 0.00–0.49 | Requires review before use |
| Medium | 0.50–0.74 | Usable as a draft with visible caution |
| High | 0.75–0.94 | Can be used in workflow with audit trail |
| Verified | 0.95–1.00 | Confirmed by user or validated source |

## Knowledge Verification

Knowledge becomes trusted through:

1. direct user confirmation;
2. manual correction;
3. repeated successful matching;
4. source document evidence;
5. supplier or quote validation.

## Knowledge Aging

Construction knowledge can become stale. Mnelo must support aging rules for:

- supplier capability;
- pricing history;
- product availability;
- manufacturer references;
- project-specific assumptions;
- regulatory or specification-driven decisions.

## Knowledge Sources

| Source | Trust Consideration |
| --- | --- |
| Uploaded document | Strong source but may be superseded |
| BOQ parser | Requires confidence and cleanup |
| AI extraction | Requires explanation and review controls |
| User correction | Strong training signal |
| User confirmation | Strong verification signal |
| Supplier quote | Strong commercial signal with validity date |

## Explainability

Every graph-derived recommendation must answer:

- What source supported this?
- What confidence score was assigned?
- Was this learned from a previous correction?
- Has a human confirmed it?
- What changed since the previous version?

## Scalability

The Knowledge Graph must support incremental growth from project-level intelligence to company-level and marketplace-level intelligence. Early implementation can use relational tables, but the model must preserve graph concepts so future graph-native storage remains possible.
