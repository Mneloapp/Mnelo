# Manual Classification Memory

## Purpose

Manual BOQ classifications must survive parsing cycles. Parsed BOQ rows are operational records, not durable learning records, because reparse can delete and recreate `boq_items` with new row IDs.

Mnelo stores user-confirmed classifications in durable memory so future parses can restore the same system, category and subcategory before rules or AI run.

All classification decisions must flow through the central classification engine:

```ts
classifyBoqItem(input, context)
```

The parser and reparse workflow are not allowed to own classification logic. They extract rows and context, then call the engine.

## Why `boq_items` Is Not Durable

`boq_items` represents the current parsed state of an uploaded workbook. During reparse, rows may be removed and inserted again to reflect the latest workbook structure, cleanup rules and parser behavior.

Because row IDs can change, manual corrections must not depend only on `boq_items.id`.

## Storage

Manual classification memory is stored in two compatible layers:

1. `classification_learning_memory` is the durable cross-project learning memory used for future classification matches.
2. `ai_training_data` remains populated for audit compatibility and older reparse restore paths.

Canonical fields:

| Field | Meaning |
| --- | --- |
| `organization_id` | Learning scope. Until organization accounts are formalized, Mnelo uses the authenticated user ID as the organization scope. |
| `normalized_description` | Normalized text used for exact and safe similar matching. |
| `original_description` | Original BOQ item description. |
| `classification_system` | Canonical user-confirmed system used by the central engine. |
| `classification_category` | Canonical user-confirmed category used by the central engine. |
| `classification_subcategory` | Canonical user-confirmed subcategory used by the central engine. |
| `system` | Legacy-compatible user-confirmed system. |
| `category` | Legacy-compatible user-confirmed category. |
| `subcategory` | Legacy-compatible user-confirmed subcategory. |
| `source` | Source of the memory record, usually `user`. |
| `confidence` | Verification level, usually `verified` for manual corrections. |
| `created_from_project_id` | Project where the correction was made. |
| `created_from_file_id` | Uploaded file where the correction was made, when available. |

Compatibility fields in `ai_training_data`:

| Field | Meaning |
| --- | --- |
| `project_id` | Project where the correction was made. |
| `user_id` | User who made the correction. |
| `item_description` | Original BOQ item description. |
| `normalized_description` | Normalized text used for matching. |
| `item_fingerprint` | Strict match key from sheet, row, description, quantity and unit. |
| `source_sheet_name` | Excel sheet name when available. |
| `source_row_number` | Excel source row number when available. |
| `quantity` | Parsed item quantity used for matching. |
| `unit` | Parsed item unit used for matching. |
| `final_system` | User-confirmed system. |
| `final_category` | User-confirmed category. |
| `final_subcategory` | User-confirmed subcategory. |
| `final_classification_subcategory` | Canonical user-confirmed subcategory for code paths that distinguish category and subcategory. |

Legacy fields such as `user_corrected_category`, `user_corrected_subcategory`, `output.system`, `output.category` and `output.subcategory` are still populated for compatibility.

## Central Engine Precedence

The central classification engine enforces one priority order:

1. User correction
2. Learned memory
3. AI result
4. Rules
5. Unknown / Needs Review

If `classification_learning_memory` has an exact `normalized_description` match, the engine applies:

- `classification_source = learned`
- `needs_review = false`
- stored system, category and subcategory

The engine then stops. Rules, inherited Excel context and unknown fallback must not overwrite the learned result.

## Matching During Reparse

When a workbook is reparsed, Mnelo does not run separate restore logic as the owner of classification. Reparse collects current manual corrections, backfills durable memory, deletes/recreates parsed rows if needed, and sends every new item row through `classifyBoqItem()`.

The engine consumes durable memory before rules. Rules are only allowed to run when no user, learned or AI classification exists.

Matching order:

1. Current user correction captured before reparse.
2. Exact `classification_learning_memory.normalized_description`.
3. Compatible legacy memory as learning input.
4. AI result, when available and complete.
5. Rules classifier with genuine keyword evidence.
6. Weak Excel context as a system hint.
7. Needs Review.

`boq_items.id` is never used for reparse matching because reparse can delete and recreate parsed rows.

If a user or learned match is found, Mnelo applies:

- `classification_source = user` or `learned`
- `classification_confidence = 1`
- `needs_review = false`
- `user_corrected = true`
- saved `final_system`, `final_category` and `final_subcategory`

## Precedence Rule

User corrections always override rules, inherited Excel context and AI.

Rules and AI may only classify rows that do not already have a manual or learned correction.

## Cross-Project Learning

When a user manually saves a BOQ classification, Mnelo writes the correction to the current `boq_items` row and also upserts a `classification_learning_memory` record. Future projects use normalized description matching to apply verified user knowledge before rules or AI.

Exact normalized description matches are applied first. Similar matches must have strong token coverage and a valid system, category and subcategory before Mnelo treats them as learned classifications.
