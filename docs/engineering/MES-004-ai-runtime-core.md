# MES-004 — AI Runtime Core

## Purpose

This specification defines the first code-level foundation for Mnelo AI Runtime.

The runtime foundation is provider-independent. It does not call OpenAI, Anthropic, Google, Azure OpenAI or local models. It defines the shared agent contracts that future AI workflows will use inside Mnelo.

## Scope

MES-004 introduces:

| Component | Responsibility |
| --- | --- |
| Agent | Provider-independent executable unit |
| Agent Context | Structured workflow context passed to agents |
| Agent Result | Standardized output envelope for all agents |
| Confidence | Normalized confidence model |
| Finding | Structured observation or extracted result |
| Warning | Reviewable issue or limitation |
| createAgent | Helper for defining future agents consistently |

## Non-Goals

MES-004 does not implement:

- provider SDKs;
- model calls;
- prompts;
- UI integration;
- database persistence;
- migrations;
- background jobs.

## Agent Contract

Every Mnelo agent must define:

- id;
- name;
- version;
- description;
- input schema;
- output schema;
- execute function.

The agent contract exists so future workflows can call agents consistently without depending on provider-specific code.

## Agent Context

Agents should receive structured domain context instead of raw text when possible.

Supported context areas include:

- Project;
- Documents;
- Files;
- BOQ Items;
- User;
- Organization;
- Language;
- Previous Knowledge;
- Workflow Stage.

## Agent Result

Every agent returns an `AgentResult`.

The result includes:

- success;
- confidence;
- findings;
- warnings;
- errors;
- metadata;
- duration;
- source references;
- output.

AI output must not be returned as unstructured text only.

## Confidence Model

Confidence levels:

| Level | Meaning |
| --- | --- |
| HIGH | Strong enough to proceed automatically where workflow risk allows |
| MEDIUM | Usable but should be marked for verification |
| LOW | Human review required |
| UNKNOWN | Confidence cannot be determined |

The implementation keeps confidence as a typed value with a normalized score and reason.

## Provider Independence

Application workflows must depend on Mnelo AI Runtime contracts, not provider SDKs.

Provider adapters will be introduced later behind runtime interfaces. This keeps future agents portable across OpenAI, Anthropic, Google, Azure OpenAI and local model providers.

## Integration Rule

This foundation must not change existing application behavior. Future deliverables may connect Project Intelligence workflows to the runtime after agent registry, runner and provider adapter interfaces are defined.

## Acceptance Criteria

| Criteria | Requirement |
| --- | --- |
| Typed contracts | Agent, context, result, confidence, finding and warning types exist |
| Provider independent | No provider SDK or API call is added |
| Runtime helper | `createAgent` helper exists for future agents |
| Central exports | `lib/ai/index.ts` exports runtime types and helpers |
| No behavior change | UI, database and existing application logic remain unchanged |
| Build safety | lint, typecheck and build pass |
