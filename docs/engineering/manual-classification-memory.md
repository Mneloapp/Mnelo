# Manual Classification Memory

## Purpose

Manual BOQ classifications must survive parsing cycles. Parsed BOQ rows are operational records, not durable learning records, because reparse can delete and recreate `boq_items` with new row IDs.

Mnelo stores user-confirmed classifications in durable memory so future parses can restore the same system, category and subcategory before rules or AI run.

## Why `boq_items` Is Not Durable

`boq_items` represents the current parsed state of an uploaded workbook. During reparse, rows may be removed and inserted again to reflect the latest workbook structure, cleanup rules and parser behavior.

Because row IDs can change, manual corrections must not depend only on `boq_items.id`.

## Storage

Manual classification memory is stored in `ai_training_data`.

Canonical fields:

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

When a workbook is reparsed, Mnelo restores manual classifications before applying rules or AI.

Matching order:

1. Strict fingerprint: sheet + row + normalized description + quantity + unit.
2. Content fingerprint: normalized description + quantity + unit.
3. Description and unit.
4. Normalized description only when it is unique.

If a match is found, Mnelo applies:

- `classification_source = learned`
- `classification_confidence = 1`
- `needs_review = false`
- `user_corrected = true` where available
- saved `final_system`, `final_category` and `final_subcategory`

## Precedence Rule

User corrections always override rules, inherited Excel context and AI.

Rules and AI may only classify rows that do not already have a manual or learned correction.
