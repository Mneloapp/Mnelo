import * as XLSX from "xlsx";
import { cleanupBoqRow, type BoqRowType } from "@/lib/boq-cleanup";
import { inferClassificationFromExcelContext, NEEDS_REVIEW_SYSTEM, sanitizeClassificationLabel } from "@/lib/classification";

const descriptionHeaders = [
  "description",
  "item",
  "name",
  "scope",
  "works",
  "დასახელება",
  "აღწერა",
  "სამუშაო",
  "სამუშაოს დასახელება",
  "наименование",
  "описание",
  "работа",
  "açıklama",
  "kalem",
  "iş tanımı",
];
const quantityHeaders = ["qty", "quantity", "count", "რაოდენობა", "რაოდ", "количество", "кол-во", "miktar", "adet"];
const unitHeaders = ["unit", "uom", "ერთეული", "განზომილება", "единица", "ед. изм", "birim"];
const rateHeaders = [
  "rate",
  "unit price",
  "price",
  "ერთეულის ფასი",
  "ფასი",
  "цена",
  "цена за единицу",
  "birim fiyat",
  "fiyat",
];
const amountHeaders = ["amount", "total", "sum", "ჯამი", "თანხა", "სულ", "сумма", "итого", "toplam", "tutar"];
const numberHeaders = ["no", "no.", "number", "#", "№", "item no", "n", "N"];

export type ParsedBoqRow = {
  description: string;
  quantity: number | null;
  unit: string | null;
  rate: number | null;
  amount: number | null;
  cleanup_reason?: string;
  inherited_category?: string | null;
  inherited_subcategory?: string | null;
  row_type?: BoqRowType;
  section_header?: string | null;
  sheet_name: string;
  source_row_number?: number;
  source_sheet_name?: string;
  row_number: number;
};

export type ColumnMapping = {
  description: string;
  quantity: string | null;
  unit: string | null;
  rate: string | null;
  amount: string | null;
};

export type MappingColumnOption = {
  label: string;
  value: string;
};

export type BoqParserSummary = {
  headerRows: number;
  ignoredRows: number;
  itemRows: number;
  needsReviewRows: number;
  persisted?: {
    inheritedRows: number;
    itemRows: number;
    totalRows: number;
  };
  rowsSentToAi: number;
  rowsWithInheritedSection: number;
  sheetsParsed: number;
  totalParsedRows: number;
  sheets: Array<{
    headerRows: number;
    ignoredRows: number;
    itemRows: number;
    needsReviewRows: number;
    rows: number;
    rowsWithInheritedSection: number;
    sheetName: string;
  }>;
};

export class MappingRequiredError extends Error {
  columns: MappingColumnOption[];

  constructor(columns: MappingColumnOption[]) {
    super("Column detection confidence is low. Select BOQ columns manually.");
    this.columns = columns;
  }
}

function normalizeHeader(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ");
}

function cellText(value: unknown) {
  return String(value || "").trim();
}

function parseNumber(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const text = String(value || "")
    .replace(/,/g, "")
    .replace(/[$€£]/g, "")
    .trim();

  if (!text || !/^-?\d+(\.\d+)?$/.test(text)) {
    return null;
  }

  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function findColumn(headers: unknown[], names: string[]) {
  return headers.findIndex((header) => {
    const normalizedHeader = normalizeHeader(header);

    return names.some((name) => {
      const normalizedName = normalizeHeader(name);
      return normalizedHeader === normalizedName || normalizedHeader.includes(normalizedName);
    });
  });
}

function findMappedColumn(headers: unknown[], mappedHeader: string | null) {
  if (!mappedHeader) {
    return -1;
  }

  return headers.findIndex((header) => normalizeHeader(header) === mappedHeader);
}

function uniqueColumnOptions(headers: unknown[]) {
  const options = new Map<string, MappingColumnOption>();

  for (const header of headers) {
    const label = cellText(header);
    const value = normalizeHeader(header);

    if (label && value && !options.has(value)) {
      options.set(value, { label, value });
    }
  }

  return Array.from(options.values());
}

function selectHeaderMatch(rows: unknown[][], mapping?: ColumnMapping | null) {
  return rows
    .slice(0, 50)
    .map((row, index) => {
      const rowValues = Array.isArray(row) ? row : [];
      const nonEmpty = rowValues.filter((value) => cellText(value));
      const rowIsNumericHelper = nonEmpty.length > 0 && nonEmpty.every((value) => parseNumber(value) !== null);
      const descriptionColumn = mapping?.description
        ? findMappedColumn(rowValues, mapping.description)
        : findColumn(rowValues, descriptionHeaders);
      const quantityColumn = mapping?.quantity ? findMappedColumn(rowValues, mapping.quantity) : findColumn(rowValues, quantityHeaders);
      const unitColumn = mapping?.unit ? findMappedColumn(rowValues, mapping.unit) : findColumn(rowValues, unitHeaders);
      const rateColumn = mapping?.rate ? findMappedColumn(rowValues, mapping.rate) : findColumn(rowValues, rateHeaders);
      const amountColumn = mapping?.amount ? findMappedColumn(rowValues, mapping.amount) : findColumn(rowValues, amountHeaders);
      const numberColumn = findColumn(rowValues, numberHeaders);
      const score =
        (rowIsNumericHelper ? -10 : 0) +
        (numberColumn >= 0 ? 1 : 0) +
        (descriptionColumn >= 0 ? 4 : 0) +
        (quantityColumn >= 0 ? 2 : 0) +
        (unitColumn >= 0 ? 1 : 0) +
        (rateColumn >= 0 ? 1 : 0) +
        (amountColumn >= 0 ? 1 : 0);

      return {
        amountColumn,
        descriptionColumn,
        index,
        quantityColumn,
        rateColumn,
        score,
        unitColumn,
      };
    })
    .sort((a, b) => b.score - a.score)[0];
}

async function readWorkbook(source: Blob) {
  try {
    const buffer = await source.arrayBuffer();
    return XLSX.read(buffer, { cellDates: true, cellStyles: true, dense: false, type: "array" });
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Unable to read Excel workbook.");
  }
}

function getSheetRows(sheet: XLSX.WorkSheet) {
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    blankrows: true,
    defval: "",
    header: 1,
    raw: true,
  });
}

function rowText(row: unknown[]) {
  return row
    .map((value) => cellText(value))
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function getSheetCell(sheet: XLSX.WorkSheet, rowIndex: number, columnIndex: number) {
  return sheet[XLSX.utils.encode_cell({ c: columnIndex, r: rowIndex })] as
    | { s?: { fill?: { fgColor?: { rgb?: string }; patternType?: string }; font?: { bold?: boolean } } }
    | undefined;
}

function rowHasColoredFill(sheet: XLSX.WorkSheet, rowIndex: number, maxColumns: number) {
  for (let columnIndex = 0; columnIndex < maxColumns; columnIndex += 1) {
    const fill = getSheetCell(sheet, rowIndex, columnIndex)?.s?.fill;
    const color = fill?.fgColor?.rgb?.toUpperCase();

    if (color && color !== "FFFFFF" && color !== "FFFFFFFF" && color !== "00000000") {
      return true;
    }
  }

  return false;
}

function rowHasBoldText(sheet: XLSX.WorkSheet, rowIndex: number, maxColumns: number) {
  for (let columnIndex = 0; columnIndex < maxColumns; columnIndex += 1) {
    if (getSheetCell(sheet, rowIndex, columnIndex)?.s?.font?.bold) {
      return true;
    }
  }

  return false;
}

function rowHasMerge(sheet: XLSX.WorkSheet, rowIndex: number) {
  return Boolean(
    (sheet["!merges"] || []).some((merge) => merge.s.r <= rowIndex && merge.e.r >= rowIndex && merge.e.c - merge.s.c >= 1),
  );
}

function looksLikeSectionHeader({
  amount,
  description,
  maxColumns,
  quantity,
  rate,
  row,
  rowIndex,
  sheet,
  unit,
}: {
  amount: number | null;
  description: string;
  maxColumns: number;
  quantity: number | null;
  rate: number | null;
  row: unknown[];
  rowIndex: number;
  sheet: XLSX.WorkSheet;
  unit: string | null;
}) {
  const text = rowText(row) || description;
  const filledCells = row.map((value) => cellText(value)).filter(Boolean).length;
  const hasNumericData = quantity !== null || rate !== null || amount !== null || Boolean(unit);

  if (!text || hasNumericData) {
    return false;
  }

  const visualHeader = rowHasMerge(sheet, rowIndex) || rowHasColoredFill(sheet, rowIndex, maxColumns) || rowHasBoldText(sheet, rowIndex, maxColumns);
  const compactHeader = text.length <= 90 && filledCells <= 3;
  const sectionContext = sanitizeClassificationLabel(text);
  const knownHeader = sectionContext ? inferClassificationFromExcelContext(null, sectionContext) : null;

  return visualHeader || compactHeader || Boolean(knownHeader && knownHeader.systemName !== NEEDS_REVIEW_SYSTEM);
}

function sectionHeaderContext(value: string) {
  return sanitizeClassificationLabel(value);
}

function buildParsedBoqRow({
  amount,
  currentSectionHeader,
  description,
  quantity,
  rate,
  rowNumber,
  sheetName,
  unit,
}: {
  amount: number | null;
  currentSectionHeader: string | null;
  description: string;
  quantity: number | null;
  rate: number | null;
  rowNumber: number;
  sheetName: string;
  unit: string | null;
}) {
  return {
    amount,
    description,
    inherited_category: currentSectionHeader,
    inherited_subcategory: currentSectionHeader,
    quantity,
    rate,
    row_number: rowNumber,
    section_header: currentSectionHeader,
    sheet_name: sheetName,
    source_row_number: rowNumber,
    source_sheet_name: sheetName,
    unit,
  } satisfies ParsedBoqRow;
}

function getMappingColumns(workbook: XLSX.WorkBook) {
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = getSheetRows(sheet);
    const candidate = rows.slice(0, 50).find((row) => uniqueColumnOptions(row).length > 1);

    if (candidate) {
      return uniqueColumnOptions(candidate);
    }
  }

  return [];
}

function inferColumnsFromDataRows(rows: unknown[][]) {
  const maxColumns = Math.max(0, ...rows.slice(0, 100).map((row) => row.length));
  const columnScores = Array.from({ length: maxColumns }, (_, columnIndex) => {
    let textCount = 0;
    let numericCount = 0;
    let shortTextCount = 0;
    let totalTextLength = 0;

    for (const row of rows.slice(0, 100)) {
      const value = row[columnIndex];
      const text = cellText(value);

      if (!text) {
        continue;
      }

      if (parseNumber(value) !== null) {
        numericCount += 1;
        continue;
      }

      textCount += 1;
      totalTextLength += text.length;

      if (text.length <= 12) {
        shortTextCount += 1;
      }
    }

    return {
      columnIndex,
      numericCount,
      textCount,
      shortTextCount,
      totalTextLength,
    };
  });
  const descriptionColumn =
    [...columnScores].filter((column) => column.textCount > 0).sort((a, b) => b.totalTextLength - a.totalTextLength)[0]
      ?.columnIndex ?? -1;
  const numericColumns = columnScores
    .filter((column) => column.numericCount > 0)
    .sort((a, b) => b.numericCount - a.numericCount)
    .map((column) => column.columnIndex)
    .filter((columnIndex) => columnIndex !== descriptionColumn);
  const unitColumn =
    [...columnScores]
      .filter((column) => column.columnIndex !== descriptionColumn && column.shortTextCount > 0)
      .sort((a, b) => b.shortTextCount - a.shortTextCount)[0]?.columnIndex ?? -1;

  return {
    amountColumn: numericColumns[2] ?? -1,
    descriptionColumn,
    quantityColumn: numericColumns[0] ?? -1,
    rateColumn: numericColumns[1] ?? -1,
    rowStartIndex: rows.findIndex((row) => descriptionColumn >= 0 && cellText(row[descriptionColumn])),
    unitColumn,
  };
}

export function normalizeParsedBoqRows(rows: ParsedBoqRow[]) {
  return rows.map((row) => {
    if (row.row_type) {
      return row;
    }

    const cleanup = cleanupBoqRow({
      amount: row.amount,
      description: row.description,
      quantity: row.quantity,
      rate: row.rate,
      unit: row.unit,
    });

    return {
      ...row,
      cleanup_reason: cleanup.reason,
      row_type: cleanup.rowType,
    } satisfies ParsedBoqRow;
  });
}

export function getBoqParserSummary(rows: ParsedBoqRow[]): BoqParserSummary {
  const normalizedRows = normalizeParsedBoqRows(rows);
  const sheets = new Map<string, BoqParserSummary["sheets"][number]>();

  for (const row of normalizedRows) {
    const sheetName = row.source_sheet_name || row.sheet_name || "Unknown";
    const summary = sheets.get(sheetName) || {
      headerRows: 0,
      ignoredRows: 0,
      itemRows: 0,
      needsReviewRows: 0,
      rows: 0,
      rowsWithInheritedSection: 0,
      sheetName,
    };
    const prediction = row.row_type === "item" ? inferClassificationFromExcelContext(row.sheet_name, row.section_header) : null;
    const needsReview = row.row_type === "item" && !prediction;

    summary.rows += 1;
    summary.headerRows += row.row_type === "header" ? 1 : 0;
    summary.ignoredRows += row.row_type && row.row_type !== "item" && row.row_type !== "header" ? 1 : 0;
    summary.itemRows += row.row_type === "item" ? 1 : 0;
    summary.needsReviewRows += needsReview ? 1 : 0;
    summary.rowsWithInheritedSection += row.row_type === "item" && Boolean(row.section_header) ? 1 : 0;
    sheets.set(sheetName, summary);
  }

  const sheetRows = Array.from(sheets.values());
  const totals = sheetRows.reduce(
    (summary, sheet) => ({
      headerRows: summary.headerRows + sheet.headerRows,
      ignoredRows: summary.ignoredRows + sheet.ignoredRows,
      itemRows: summary.itemRows + sheet.itemRows,
      needsReviewRows: summary.needsReviewRows + sheet.needsReviewRows,
      rows: summary.rows + sheet.rows,
      rowsWithInheritedSection: summary.rowsWithInheritedSection + sheet.rowsWithInheritedSection,
    }),
    { headerRows: 0, ignoredRows: 0, itemRows: 0, needsReviewRows: 0, rows: 0, rowsWithInheritedSection: 0 },
  );

  return {
    headerRows: totals.headerRows,
    ignoredRows: totals.ignoredRows,
    itemRows: totals.itemRows,
    needsReviewRows: totals.needsReviewRows,
    rowsSentToAi: totals.needsReviewRows,
    rowsWithInheritedSection: totals.rowsWithInheritedSection,
    sheets: sheetRows,
    sheetsParsed: sheetRows.filter((sheet) => sheet.rows > 0).length,
    totalParsedRows: totals.rows,
  };
}

export async function parseBoqWorkbook(source: Blob, mapping?: ColumnMapping | null) {
  const workbook = await readWorkbook(source);
  const parsedRows: ParsedBoqRow[] = [];

  if (workbook.SheetNames.length === 0) {
    throw new Error("Workbook has no sheets.");
  }

  let bestScore = 0;

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = getSheetRows(sheet);
    const headerMatch = selectHeaderMatch(rows, mapping);
    const headerRowIndex = headerMatch?.index ?? -1;

    bestScore = Math.max(bestScore, headerMatch?.score || 0);

    if (headerRowIndex < 0 || headerMatch.descriptionColumn < 0) {
      const inferred = inferColumnsFromDataRows(rows);

      if (inferred.descriptionColumn < 0 || inferred.rowStartIndex < 0) {
        continue;
      }

      const maxColumns = Math.max(0, ...rows.map((row) => row.length));
      let currentSectionHeader: string | null = null;

      for (const [index, row] of rows.slice(inferred.rowStartIndex).entries()) {
        const rowIndex = inferred.rowStartIndex + index;
        const description = cellText(row[inferred.descriptionColumn]);
        const quantity = inferred.quantityColumn >= 0 ? parseNumber(row[inferred.quantityColumn]) : null;
        const unit = inferred.unitColumn >= 0 ? cellText(row[inferred.unitColumn]) || null : null;
        const rate = inferred.rateColumn >= 0 ? parseNumber(row[inferred.rateColumn]) : null;
        const amount = inferred.amountColumn >= 0 ? parseNumber(row[inferred.amountColumn]) : null;
        const fullRowText = rowText(row);

        if (fullRowText && looksLikeSectionHeader({ amount, description: fullRowText, maxColumns, quantity, rate, row, rowIndex, sheet, unit })) {
          const contextHeader = sectionHeaderContext(fullRowText);

          if (!contextHeader) {
            parsedRows.push({
              amount: null,
              cleanup_reason: "Numeric/helper section row ignored as classification context.",
              description: fullRowText,
              inherited_category: null,
              inherited_subcategory: null,
              quantity: null,
              rate: null,
              row_number: rowIndex + 1,
              row_type: "ignored",
              section_header: null,
              sheet_name: sheetName,
              source_row_number: rowIndex + 1,
              source_sheet_name: sheetName,
              unit: null,
            });
            continue;
          }

          currentSectionHeader = contextHeader;
          parsedRows.push({
            amount: null,
            cleanup_reason: "Section header used as inherited classification context.",
            description: fullRowText,
            inherited_category: currentSectionHeader,
            inherited_subcategory: currentSectionHeader,
            quantity: null,
            rate: null,
            row_number: rowIndex + 1,
            row_type: "header",
            section_header: currentSectionHeader,
            sheet_name: sheetName,
            source_row_number: rowIndex + 1,
            source_sheet_name: sheetName,
            unit: null,
          });
          continue;
        }

        if (!description) {
          continue;
        }

        parsedRows.push(
          buildParsedBoqRow({
            amount,
            currentSectionHeader,
            description,
            quantity,
            rate,
            rowNumber: inferred.rowStartIndex + index + 1,
            sheetName,
            unit,
          }),
        );
      }

      bestScore = Math.max(bestScore, 4);
      continue;
    }

    const maxColumns = Math.max(0, ...rows.map((row) => row.length));
    let currentSectionHeader: string | null = null;

    for (const [index, row] of rows.slice(headerRowIndex + 1).entries()) {
      const rowIndex = headerRowIndex + index + 1;
      const description = cellText(row[headerMatch.descriptionColumn]);
      const quantity = headerMatch.quantityColumn >= 0 ? parseNumber(row[headerMatch.quantityColumn]) : null;
      const unit = headerMatch.unitColumn >= 0 ? cellText(row[headerMatch.unitColumn]) || null : null;
      const rate = headerMatch.rateColumn >= 0 ? parseNumber(row[headerMatch.rateColumn]) : null;
      const amount = headerMatch.amountColumn >= 0 ? parseNumber(row[headerMatch.amountColumn]) : null;
      const fullRowText = rowText(row);

      if (fullRowText && looksLikeSectionHeader({ amount, description: fullRowText, maxColumns, quantity, rate, row, rowIndex, sheet, unit })) {
        const contextHeader = sectionHeaderContext(fullRowText);

        if (!contextHeader) {
          parsedRows.push({
            amount: null,
            cleanup_reason: "Numeric/helper section row ignored as classification context.",
            description: fullRowText,
            inherited_category: null,
            inherited_subcategory: null,
            quantity: null,
            rate: null,
            row_number: rowIndex + 1,
            row_type: "ignored",
            section_header: null,
            sheet_name: sheetName,
            source_row_number: rowIndex + 1,
            source_sheet_name: sheetName,
            unit: null,
          });
          continue;
        }

        currentSectionHeader = contextHeader;
        parsedRows.push({
          amount: null,
          cleanup_reason: "Section header used as inherited classification context.",
          description: fullRowText,
          inherited_category: currentSectionHeader,
          inherited_subcategory: currentSectionHeader,
          quantity: null,
          rate: null,
          row_number: rowIndex + 1,
          row_type: "header",
          section_header: currentSectionHeader,
          sheet_name: sheetName,
          source_row_number: rowIndex + 1,
          source_sheet_name: sheetName,
          unit: null,
        });
        continue;
      }

      if (!description) {
        continue;
      }

      parsedRows.push(
        buildParsedBoqRow({
          amount,
          currentSectionHeader,
          description,
          quantity,
          rate,
          rowNumber: headerRowIndex + index + 2,
          sheetName,
          unit,
        }),
      );
    }
  }

  if (!mapping && bestScore < 4) {
    throw new MappingRequiredError(getMappingColumns(workbook));
  }

  if (parsedRows.length === 0) {
    if (mapping) {
      throw new Error("No BOQ rows were parsed with the selected column mapping.");
    }

    throw new MappingRequiredError(getMappingColumns(workbook));
  }

  return parsedRows;
}
