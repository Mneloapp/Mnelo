# Mnelo Domain Model

## Purpose

Mnelo is not a generic web app. Mnelo is a Construction Procurement Operating System.

The Domain Model defines the core business language, entities, aggregates, value objects and domain events used across the platform. It gives product, engineering and AI systems a shared vocabulary for project intelligence, procurement workflows and reusable knowledge.

## Core Domain Philosophy

The domain model exists to make construction procurement knowledge explicit.

Mnelo should model real procurement concepts before modeling screens, tables or integrations. AI agents, application workflows and future APIs should operate on domain objects whenever possible instead of raw text or loosely shaped data.

## Core Business Language

| Term | Meaning |
| --- | --- |
| Project | A construction tender or active procurement workspace |
| Document | A source file that carries project, commercial or technical evidence |
| Entity | A structured object extracted from documents or BOQ rows |
| Knowledge | A reusable verified fact, relationship or decision |
| Procurement Package | A grouped set of requirements prepared for sourcing or RFQ |
| Supplier | A company that can provide, quote or deliver goods or services |
| Product Requirement | A project-specific need that may map to products, suppliers and quotes |
| Quote | A supplier commercial response to a requirement or package |
| Review Item | A low-confidence or high-risk item requiring human decision |

## Domain Areas

| Domain Area | Responsibility |
| --- | --- |
| Organization | Account, users, permissions and company-level knowledge |
| Project | Project workspace, scope, documents, intelligence and activity |
| Document | Uploaded files, versions, classification and processing state |
| Procurement | RFQs, quotes, purchase orders and procurement execution |
| Knowledge | Verified facts, graph relationships, source evidence and reuse |
| AI | Agent execution, confidence, audit, review and provider abstraction |
| Supplier | Supplier identity, capability, responsiveness and commercial history |
| Product | Product requirements, products, manufacturers and alternatives |
| Commercial | money, rates, quantities, estimates, quotes and invoices |
| Logistics | shipment status, delivery dates and supply movement |

## Core Entities

| Entity | Description |
| --- | --- |
| Organization | Company using Mnelo |
| User | Person operating inside an organization |
| Project | Tender or active construction procurement workspace |
| Document | Uploaded project file |
| Document Version | Revision of a document over time |
| Processing Job | Work item for document parsing, classification or extraction |
| Extracted Entity | Structured object extracted from a document or BOQ |
| Review Item | Item requiring human approval, edit, rejection, merge or ignore |
| Knowledge Node | Verified concept in the knowledge graph |
| Knowledge Edge | Verified relationship between knowledge nodes |
| Product Requirement | Project-specific product, material, equipment or service need |
| Product | Known product or product family |
| Manufacturer | Company that manufactures a product |
| Supplier | Company that can quote or supply |
| Distributor | Company that distributes products from manufacturers |
| RFQ | Request for quotation sent to suppliers |
| Quote | Supplier response to an RFQ or requirement |
| Purchase Order | Commercial order issued to a supplier |
| Shipment | Delivery movement or logistics update |
| Invoice | Supplier billing document |

## Aggregates

| Aggregate | Boundary |
| --- | --- |
| Project Aggregate | Project, project documents, processing activity, extracted project intelligence and project settings |
| Document Aggregate | Document, document versions, processing jobs and source evidence |
| Knowledge Aggregate | Knowledge nodes, knowledge edges, confidence, provenance and verification state |
| Procurement Package Aggregate | Product requirements, RFQ package structure, quote scope and procurement package status |
| Supplier Aggregate | Supplier profile, capabilities, contacts and historical performance |
| Product Aggregate | Product, manufacturer, specifications, alternatives and product matching history |

## Value Objects

| Value Object | Description |
| --- | --- |
| Money | Amount and currency |
| Quantity | Numeric value with unit |
| Unit | Measurement unit such as item, m, m2, kg or set |
| Confidence Score | Normalized confidence value used by AI, rules and knowledge |
| Revision | Version identifier for documents, entities or knowledge |
| Document Type | BOQ, specification, drawing, addendum or other project document type |
| Processing Status | Queued, processing, completed, needs review or failed |
| Language | Language detected or selected for document processing |
| Country | Country context for sourcing, currency, tax and logistics |
| Currency | ISO currency or project commercial currency |

## Domain Events

| Event | Meaning |
| --- | --- |
| ProjectCreated | A project workspace was created |
| DocumentUploaded | A document was uploaded to a project |
| DocumentProcessingQueued | A document was queued for processing |
| DocumentClassified | A document type or discipline was classified |
| EntityExtracted | A structured entity was extracted |
| ReviewRequired | An output requires human review |
| ReviewApproved | A review item was approved |
| KnowledgeNodeCreated | A knowledge node was created |
| KnowledgeEdgeCreated | A knowledge relationship was created |
| ProductMatched | A product requirement was matched to a product |
| SupplierDiscovered | A supplier candidate was discovered |
| RFQCreated | An RFQ package was created |
| QuoteReceived | A supplier quote was received |
| PurchaseOrderCreated | A purchase order was created |
| ShipmentUpdated | Shipment or delivery status changed |

## Design Rules

1. Domain language must be consistent.
2. AI must use domain objects, not raw text when possible.
3. Knowledge must always be linked to source evidence.
4. Important changes must create domain events.
5. Domain objects must be version-ready.
6. Supplier/RFQ/Marketplace features remain out of scope for Sprint 1.
