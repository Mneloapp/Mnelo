# Manual Classification Memory

## Purpose

Manual BOQ classifications must survive parsing cycles. Parsed BOQ rows are operational records, not durable learning records, because reparse can delete and recreate `boq_items` with new row IDs.

Mnelo stores user-confirmed classifications in durable memory so future parses can restore the same system, category and subcategory before rules or AI run.

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
| `system` | User-confirmed system. |
| `category` | User-confirmed category. |
| `subcategory` | User-confirmed subcategory. |
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

## Matching Precedence During Reparse

When a workbook is reparsed, Mnelo restores manual classifications before applying rules, inherited Excel context or AI. The reparse resolver must consume durable memory first; rules are only allowed to run when no durable or preserved manual match exists.

Matching order:

1. Durable manual memory strict fingerprint: file + sheet + row + normalized description + quantity + unit.
2. Durable manual memory sheet/content fingerprint: file + sheet + normalized description + quantity + unit.
3. Durable manual memory content fingerprint: file + normalized description + quantity + unit.
4. Durable manual memory description and unit: file + normalized description + unit.
5. Durable manual memory normalized description when it is unique for the file.
6. Durable manual memory normalized description only when it is globally unique.
7. Current parsed row manual correction using the same matching order.
8. Learned correction from `classification_learning_memory` or compatible `ai_training_data`.
9. Rules classifier.
10. Weak Excel context as a system hint.
11. Needs Review.

`boq_items.id` is never used for reparse matching because reparse can delete and recreate parsed rows.

If a match is found, Mnelo applies:

- `classification_source = user`
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
