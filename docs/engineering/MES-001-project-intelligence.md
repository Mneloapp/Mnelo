# MES-001 — Project Intelligence Engine

## Status

Proposed

## Objective

The Project Intelligence Engine transforms uploaded project documents into structured, explainable and reusable knowledge.

It is the first major engineering system in Mnelo because every downstream capability depends on reliable project understanding.

## Processing Pipeline

```text
Upload
→ Document Registration
→ Processing Event
→ Document Classification
→ Content Extraction
→ Entity Extraction
→ BOQ Parsing
→ Confidence Scoring
→ Review Queue
→ Knowledge Creation
```

## Upload Architecture

| Step | Responsibility |
| --- | --- |
| File intake | Accept supported document types and validate file metadata |
| Storage | Store original files without mutation |
| Registration | Create a project file record with owner, project and document type |
| Processing trigger | Emit a processing event for downstream intelligence work |
| Status tracking | Track uploaded, processing, parsed, reviewed and failed states |

## Document Intelligence Agent

The Document Intelligence Agent identifies what each file is and what processing path it needs.

| Classification | Example |
| --- | --- |
| BOQ Excel | quantity and cost workbook |
| Specification PDF | technical requirements |
| Drawing PDF | drawing package or discipline drawing |
| Tender Document | instructions, scope, commercial conditions |
| Addendum | revision or clarification |
| Other | unrecognized but retained document |

## Entity Extraction

The engine must extract entities that can become procurement knowledge.

| Entity Type | Example |
| --- | --- |
| System | HVAC, Plumbing, Electrical, Fire Fighting |
| Category | Air Distribution, Lighting, Pumps |
| Product | fan coil unit, cable tray, valve |
| Specification | DN, size, capacity, standard, rating |
| Manufacturer | brand or named manufacturer |
| Quantity | numeric takeoff value |
| Unit | item, m, m2, kg, set |

## Review Queue

Low-confidence outputs must not disappear into the project silently.

Review queue entries should include:

- entity or row being reviewed;
- proposed classification;
- confidence score;
- explanation;
- source document reference;
- correction controls;
- confirmation action.

## Knowledge Engine

Verified outputs become reusable knowledge. Knowledge can be created from:

1. high-confidence extraction;
2. user confirmation;
3. manual correction;
4. repeated matching across projects;
5. supplier or quote validation.

## Acceptance Criteria

| Area | Criteria |
| --- | --- |
| Upload | No supported document is lost after upload |
| Classification | 95%+ document classification accuracy on target tender packages |
| BOQ extraction | 90%+ entity extraction accuracy on representative BOQs |
| Review | Low-confidence outputs enter review queue |
| Knowledge | User corrections are stored as reusable project knowledge |
| Audit | AI decisions include source, confidence and reason |

## Definition of Done

- Project files are stored and registered.
- Processing status is visible.
- BOQ and document entities are extracted into structured records.
- Low-confidence outputs are reviewable.
- Confirmed and corrected classifications become reusable knowledge.
- Errors are visible and recoverable.
- No application functionality relies on hidden AI behavior.
