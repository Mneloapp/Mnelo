# MES-009 — Requirement Views Architecture

## Purpose

This document defines how one Requirement is presented to different business roles without duplicating business objects.

A Requirement has one identity. It never changes. Only its business views change depending on the user's responsibility.

Mnelo must never duplicate Requirement data for different departments. Every department reads the same Requirement through a different View.

## 1. Why Requirement Views Exist

Construction procurement involves multiple business roles working on the same underlying need.

The same Requirement may be used by:

- Estimation Engineer
- Procurement Manager
- Project Manager
- Finance
- Management

These roles do not need different business objects. They need different information, actions and levels of detail.

Requirement Views exist so Mnelo can support each role without copying or fragmenting the Requirement.

## 2. Requirement View Philosophy

Requirement = Truth.

View = Perspective.

Views never own data.

Views never duplicate data.

Views only expose different parts of the same Requirement.

This keeps Mnelo's domain model stable while allowing the product experience to adapt to each user's responsibility.

## 3. Core View Architecture

```text
One Requirement
↓
Estimation View
↓
Procurement View
↓
Construction View
↓
Finance View
↓
Management View
```

Every View reads the same Requirement identity, history, sources and events.

## 4. Estimation View

### Purpose

Prepare tender pricing.

### Display

- Requirement Name
- Quantity
- Unit
- Technical Specification
- AI Confidence
- Missing Specifications
- Received Supplier Prices
- Selected Tender Price
- BOQ Writeback Status
- Ready For Tender

### Actions

- Request Quotes
- Compare Quotes
- Select Tender Price
- Write Back To BOQ

## 5. Procurement View

### Purpose

Purchase materials.

### Display

- Requirement
- Package
- Supplier
- Selected Quote
- Lead Time
- Purchase Status
- Ordered Quantity
- Delivered Quantity
- Remaining Quantity

### Actions

- Create RFQ
- Select Supplier
- Create Purchase Order
- Track Delivery

## 6. Construction View

### Purpose

Support project execution.

### Display

- Required Quantity
- Delivered Quantity
- Installed Quantity
- Remaining Quantity
- Location
- Building
- Floor
- Zone
- Dependencies

### Actions

- Receive Materials
- Confirm Installation
- Report Missing Materials

## 7. Finance View

### Purpose

Financial control.

### Display

- Budget Price
- Tender Price
- Purchase Price
- Invoice Price
- Variance
- Payment Status
- Currency
- Supplier

### Actions

- Approve Payment
- Review Variance
- Export Cost Report

## 8. Management View

### Purpose

Executive overview.

### Display

- Requirement Health
- Risk Level
- Budget Impact
- Procurement Progress
- Delivery Progress
- Supplier Performance
- Overall Status

### Actions

- Approve
- Escalate
- Review Risks

## 9. Shared Fields

These appear in every view.

- Requirement ID
- Name
- Status
- Stage
- Confidence
- Needs Review
- History
- Events
- Created
- Updated

Shared fields keep every role aligned around the same business object.

## 10. View Ownership

Requirement owns:

- Identity
- History
- Sources
- Knowledge

Views own:

- Presentation
- Workflow actions
- Filtering
- Visualization

Views may shape how users interact with a Requirement, but they must not create separate data ownership.

## 11. Workflow Relationship

```text
Tender View
↓
Tender Submission
↓
Project Award
↓
Procurement View
↓
Purchase Orders
↓
Construction View
↓
Finance View
↓
Closed
```

Requirement identity never changes.

The workflow can move from tender to procurement to delivery while keeping the same Requirement as the source of truth.

## 12. AI Responsibilities

AI helps each View differently.

| View | AI Responsibility |
| --- | --- |
| Estimation | Suggest prices. |
| Procurement | Suggest suppliers. |
| Construction | Predict shortages. |
| Finance | Detect budget anomalies. |
| Management | Summarize project health. |

AI recommendations must remain explainable and tied to the same Requirement identity.

## 13. Design Rules

- Every View has one primary purpose.
- Never overload a View.
- Never duplicate Requirement data.
- Never create department-specific Requirement copies.
- Requirement remains the only business truth.

## 14. Future UI Architecture

```text
Project
↓
Requirements
↓
Requirement
↓
Tabs
  Estimation
  Procurement
  Construction
  Finance
  Management
```

Every tab reads the same Requirement.

The UI may present different actions or summaries per tab, but all tabs must resolve back to the same `requirement_id`.

## 15. Acceptance Criteria

- One Requirement supports every department.
- Department workflows never duplicate Requirement data.
- Requirement identity survives every workflow stage.
- Requirement is always the single source of truth.
