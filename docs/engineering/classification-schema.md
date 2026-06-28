# BOQ Classification Schema

## Purpose

This document defines the canonical classification fields used by Mnelo for `public.boq_items`.

The application stores parsed BOQ rows first, then classifies them into systems, categories and subcategories for review and future procurement workflows.

## Canonical Columns

| Column | Meaning |
| --- | --- |
| `category` | Canonical system name, for example `Electrical`, `HVAC`, or `Plumbing`. |
| `subcategory` | Canonical category/group inside the system, for example `Containment` or `Lighting`. |
| `classification_system` | User-confirmed or canonical system name. New code should prefer this when present. |
| `classification_category` | User-confirmed or canonical category/group. New code should prefer this when present. |
| `classification_subcategory` | Specific selected subcategory, for example `Junction Boxes` or `Cable Trays`. |
| `classification_source` | Source of the current classification: `rules`, `learned`, `user`, `ai`, `inherited_header`, or `needs_review`. |
| `classification_confidence` | Confidence score for the current classification, between `0` and `1`. |
| `classification_reason` | Short explanation for why the classification was assigned. |
| `classification_status` | Processing status for classification, typically `classified`, `needs_review`, or `unclassified`. |
| `needs_review` | Boolean flag for rows requiring human review. |
| `user_corrected` | Boolean flag indicating the row was manually confirmed or corrected by a user. |
| `system_id` | Optional reference to `project_systems` for structured system grouping. |
| `system_category_id` | Optional reference to `project_system_categories` for structured category grouping. |
| `takeoff_quantity` | Quantity used in takeoff/system summaries. |
| `takeoff_unit` | Normalized unit used in takeoff/system summaries. |

## Manual Correction Precedence

Manual user corrections must always win over parser, rule, AI and default classifications.

When a user manually saves a classification, the row must persist:

- `category` as the selected system
- `subcategory` as the selected category
- `classification_system` as the selected system when the column exists
- `classification_category` as the selected category when the column exists
- `classification_subcategory` as the selected subcategory
- `classification_source = 'user'`
- `classification_confidence = 1`
- `classification_reason = 'Manual bulk correction'` or equivalent manual reason
- `user_corrected = true`
- `needs_review = false` unless the user explicitly marks the row as needing review

After refresh, Intelligence views must treat `classification_source = 'user'` and historical `classification_source = 'learned'` rows as user-confirmed overrides.

## Example

For an electrical junction box row:

| Field | Value |
| --- | --- |
| `category` | `Electrical` |
| `subcategory` | `Containment` |
| `classification_system` | `Electrical` |
| `classification_category` | `Containment` |
| `classification_subcategory` | `Junction Boxes` |
| `classification_source` | `user` |
| `classification_confidence` | `1` |

This row must not fall back to `Lighting` unless the user explicitly selects Lighting.
