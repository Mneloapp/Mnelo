# Capability Map

## Purpose

This capability map defines what Mnelo must become over time. It is not a feature checklist; it is the operating model for an AI Procurement Operating System for Construction.

## Capability Areas

| Capability Area | Description | Stage |
| --- | --- | --- |
| Domain Model | Shared construction procurement language for AI Runtime, Knowledge Graph and Procurement Engine | Foundation |
| Project Workspace | Central workspace for documents, BOQ, systems and procurement activity | Foundation |
| Upload Engine | Reliable ingestion of Excel, PDF and project documents | Foundation |
| AI Runtime | Shared agent execution, context preparation, provider adapters and audit-ready result formatting | Foundation |
| Document Intelligence | Classify documents and extract structure | Project Intelligence |
| BOQ Parsing | Extract rows, quantities, units, sections and sheet context | Project Intelligence |
| Entity Extraction | Identify products, systems, specifications, manufacturers and models | Project Intelligence |
| Classification Engine | Map items into systems, categories and subcategories | Project Intelligence |
| Review Queue | Route low-confidence or ambiguous outputs to humans | Project Intelligence |
| Knowledge Engine | Store verified decisions for future reuse | Knowledge Graph |
| RFQ Generator | Create supplier-ready packages from verified BOQ knowledge | RFQ Automation |
| Supplier Intelligence | Match categories to suppliers and supplier types | Supplier Intelligence |
| Quote Intelligence | Normalize and compare supplier quotes | Quote Intelligence |
| Estimate Engine | Create estimate views from quotes, rates and assumptions | Estimate Intelligence |
| Procurement Copilot | Support purchasing, negotiation and delivery workflows | Procurement |

## Capability Maturity

| Level | Name | Description |
| --- | --- | --- |
| 1 | Structured | Data is parsed and stored consistently |
| 2 | Explainable | AI decisions include confidence, source and reason |
| 3 | Correctable | Users can correct data and teach Mnelo |
| 4 | Reusable | Verified knowledge improves future projects |
| 5 | Autonomous | Mnelo performs routine procurement preparation with review controls |

## Priority Rule

Capabilities should be built in the order that compounds knowledge. A feature that creates reusable procurement knowledge has higher priority than a feature that only displays data.

## Exclusions Until Ready

The following capabilities should not be built before the knowledge foundation is reliable:

- Marketplace.
- Payments.
- Automated supplier negotiation.
- Purchase orders.
- Global supplier network.

These require trusted project, product, supplier and quote intelligence first.
