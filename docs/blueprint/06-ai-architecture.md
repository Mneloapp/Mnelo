# Mnelo AI Architecture Blueprint

## Version

1.0 Draft

## Purpose

This document defines how artificial intelligence works inside Mnelo.

Mnelo is not a chatbot.

Mnelo is an AI-native procurement operating system where AI agents work inside structured workflows.

---

# Core Principle

AI never works alone.

AI always works inside a workflow.

Every AI action must be:

* Context-aware
* Explainable
* Auditable
* Confidence-scored
* Human-reviewable when risk is high

---

# AI System Model

Mnelo AI is built from five layers:

1. AI Runtime
2. Agent Registry
3. Specialized Agents
4. Confidence Engine
5. Audit & Review Layer

---

# AI Runtime

The AI Runtime is the shared infrastructure used by every Mnelo agent.

It handles:

* Agent execution
* Context preparation
* Timing
* Errors
* Logging
* Confidence normalization
* Result formatting

Agents should not implement these responsibilities themselves.

---

# Agent Interface

Every agent must follow the same interface.

Each agent must define:

* id
* name
* version
* description
* input schema
* output schema
* execute function

---

# Agent Context

Every agent receives structured context.

Context may include:

* Project
* Documents
* Files
* BOQ Items
* User
* Organization
* Language
* Previous Knowledge
* Workflow Stage

Agents should never operate on raw text alone when structured context is available.

---

# Agent Result

Every agent returns a standardized result.

The result must include:

* success
* confidence
* findings
* warnings
* errors
* metadata
* duration
* source references

AI output must never be returned as unstructured text only.

---

# Agent Registry

Agents are registered centrally.

The system should be able to call agents by ID.

Example:

```ts
runAgent("document-intelligence", context)
```

The registry allows Mnelo to add future agents without changing workflow code.

---

# Specialized Agents

Initial agents:

## Document Intelligence Agent

Understands document type, language, discipline, revision and metadata.

## BOQ Agent

Extracts BOQ rows, quantities, units and categories.

## Specification Agent

Extracts technical requirements and standards.

## Product Agent

Matches requirements to possible products.

## Supplier Agent

Finds and evaluates suppliers.

## RFQ Agent

Creates and manages quotation requests.

## Negotiation Agent

Assists with supplier negotiation.

---

# Confidence Engine

Every AI result must include a confidence score.

Confidence levels:

| Confidence | Behavior                               |
| ---------- | -------------------------------------- |
| 95–100%    | Can proceed automatically              |
| 80–94%     | Proceed but mark as needs verification |
| Below 80%  | Human review required                  |

AI must explain why confidence is high or low.

---

# Human Review

High-risk or low-confidence AI outputs must go to Review Queue.

Review actions:

* Approve
* Reject
* Edit
* Merge
* Ignore

Every review action becomes learning data.

---

# Provider Agnostic Design

Mnelo must not depend on one AI provider.

AI providers should be accessed through adapters.

Supported future providers may include:

* OpenAI
* Anthropic
* Google
* Azure OpenAI
* Local models

Application workflows must call Mnelo AI Runtime, not provider SDKs directly.

---

# Audit Trail

Every AI execution must be logged.

Audit records should include:

* Agent ID
* Version
* Input summary
* Output summary
* Confidence
* User
* Project
* Timestamp
* Provider
* Model
* Duration
* Errors

---

# Golden Rule

No important procurement decision should be made by AI without explanation, confidence and traceability.

---

# First Implementation Step

Before implementing any specific agent, Mnelo must implement the AI Runtime Foundation.

This includes:

* Agent types
* Agent context
* Agent result
* Agent registry
* Agent runner
* Provider adapter interface
* Mock provider for testing
