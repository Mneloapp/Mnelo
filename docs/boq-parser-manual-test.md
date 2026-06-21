# BOQ Parser Manual Test

Use an Excel workbook with these sheets:

- HEATING&COOLING
- VENTILATION
- PLUMBING
- FIRE FIGHTING
- ELECTRICITY
- FIRE ALARM
- PUBLIC ADDRESS
- DATA

For each sheet, create this structure:

- Row 7: `No | Description | Unit | Qty`
- Row 9: `1 | 2 | 3 | 4`
- Row 11: yellow merged or colored section row, for example `გაგრილების მოწყობილობები და დანადგარები`
- Rows 12 onward: real BOQ item rows

Expected result:

- Every sheet is parsed.
- Row 7 is detected as the table header.
- Row 9 is ignored as a numeric helper row.
- Row 11 is saved as `row_type = header`.
- Rows 12 onward inherit:
  - `source_sheet_name`
  - `source_row_number`
  - `section_header`
  - `inherited_category`
  - `inherited_subcategory`
- Rows below `HEATING&COOLING` and `გაგრილების მოწყობილობები და დანადგარები` classify as:
  - `category = HVAC`
  - `classification_subcategory = Cooling Equipment` when confidently matched, otherwise the original Georgian header is preserved as context.
  - `classification_source = inherited_header`
  - `needs_review = false`

Check server logs for `BOQ parser summary` after upload/parse.
