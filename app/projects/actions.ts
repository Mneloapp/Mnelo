"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as XLSX from "xlsx";
import { classifyBoqItemsWithAi, isAiClassificationConfigured } from "@/lib/ai-classifier";
import { cleanupBoqRow, type BoqRowType } from "@/lib/boq-cleanup";
import {
  classifyBoqSystem,
  getDefaultSubcategory,
  getSystemRuleOptions,
  inferClassificationFromExcelContext,
  NEEDS_REVIEW_CATEGORY,
  NEEDS_REVIEW_SUBCATEGORY,
  NEEDS_REVIEW_SYSTEM,
  normalizeTakeoffUnit,
  type SystemClassification,
} from "@/lib/classification";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { DocumentType } from "@/lib/data";

const documentTypes = ["BOQ Excel", "Specification PDF", "Drawing PDF", "Other"] satisfies DocumentType[];
const allowedExtensions = [".xlsx", ".xls", ".pdf"];
const AI_CLASSIFICATION_BATCH_SIZE = 15;
const MAX_AI_CLASSIFICATION_ITEMS_PER_RUN = 15;
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
type ParsedBoqRow = {
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

type ColumnMapping = {
  description: string;
  quantity: string | null;
  unit: string | null;
  rate: string | null;
  amount: string | null;
};

type MappingColumnOption = {
  label: string;
  value: string;
};

type ClassificationSource = "ai" | "inherited_header" | "learned" | "needs_review" | "rules";

type ClassificationPrediction = {
  predicted_category: string;
  predicted_subcategory: string;
  predicted_supplier_type: string;
  confidence_score: number;
  classification_reason: string;
  classification_source: ClassificationSource;
  predicted_classification_subcategory: string | null;
  needs_review: boolean;
};

type BoqInsertMode = {
  fileColumns: "both" | "project_file_id" | "source_file_id" | "none";
  optionalColumns: "full" | "legacy";
};

type BoqClassificationRow = {
  id: string;
  description: string;
  quantity: number | null;
  unit: string | null;
  amount?: number | null;
  category?: string | null;
  subcategory?: string | null;
  classification_confidence?: number | null;
  classification_reason?: string | null;
  classification_source?: ClassificationSource | null;
  classification_subcategory?: string | null;
  inherited_category?: string | null;
  inherited_subcategory?: string | null;
  needs_review?: boolean | null;
  project_file_id?: string | null;
  row_type?: BoqRowType | null;
  section_header?: string | null;
  source_file_id?: string | null;
  source_row_number?: number | null;
  source_sheet_name?: string | null;
};

type LearnedClassification = {
  item_description: string | null;
  final_category: string | null;
  final_subcategory: string | null;
  final_classification_subcategory?: string | null;
  user_corrected_category: string | null;
  user_corrected_subcategory: string | null;
};

function isClassificationSource(value: unknown): value is ClassificationSource {
  return value === "ai" || value === "inherited_header" || value === "learned" || value === "needs_review" || value === "rules";
}

export type ProjectDocumentActionResult = {
  ok: boolean;
  message?: string;
  error?: string;
  needsMapping?: boolean;
  mappingColumns?: MappingColumnOption[];
  projectFileId?: string;
};

class MappingRequiredError extends Error {
  columns: MappingColumnOption[];

  constructor(columns: MappingColumnOption[]) {
    super("Column detection confidence is low. Select BOQ columns manually.");
    this.columns = columns;
  }
}

function actionError(error: unknown, fallback: string): ProjectDocumentActionResult {
  return {
    ok: false,
    error: error instanceof Error ? error.message : fallback,
  };
}

function deleteStepError(step: string, message: string): ProjectDocumentActionResult {
  const error = `Failed ${step}: ${message}`;
  console.error(error);

  return {
    ok: false,
    error,
  };
}

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
}

function getFileExtension(fileName: string) {
  const index = fileName.lastIndexOf(".");
  return index >= 0 ? fileName.slice(index).toLowerCase() : "";
}

function normalizeHeader(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ");
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

function parseNumber(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const parsed = Number(
    String(value || "")
      .replace(/,/g, "")
      .replace(/[$€£]/g, "")
      .trim(),
  );

  return Number.isFinite(parsed) ? parsed : null;
}

function cellText(value: unknown) {
  return String(value || "").trim();
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

function predictClassification(row: Pick<ParsedBoqRow, "description" | "section_header" | "sheet_name">): ClassificationPrediction {
  const inheritedClassification = inferClassificationFromExcelContext(row.sheet_name, row.section_header);
  const classification = inheritedClassification || classifyBoqSystem(row.description);
  const needsReview = classification.systemName === NEEDS_REVIEW_SYSTEM;

  return {
    classification_reason:
      classification.reason ||
      (needsReview
        ? "Local classifier could not confidently map this item."
        : "Matched local classification rules."),
    classification_source: classification.source || (needsReview ? "needs_review" : "rules"),
    needs_review: needsReview,
    predicted_category: classification.systemName,
    predicted_subcategory: classification.categoryName,
    predicted_classification_subcategory: classification.subcategoryName || null,
    predicted_supplier_type: classification.supplierType,
    confidence_score: classification.confidenceScore,
  };
}

function normalizeParsedBoqRows(rows: ParsedBoqRow[]) {
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

function descriptionTokens(description: string) {
  const stopWords = new Set([
    "and",
    "the",
    "with",
    "for",
    "item",
    "works",
    "work",
    "supply",
    "installation",
    "მოწყობა",
    "სამუშაო",
    "სამუშაოები",
    "მონტაჟი",
    "მიწოდება",
    "ერთეული",
    "количество",
    "работ",
    "работы",
    "монтаж",
    "поставка",
  ]);

  return new Set(
    description
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length > 2 && !stopWords.has(token)),
  );
}

function tokenSimilarity(left: string, right: string) {
  if (left === right) {
    return 1;
  }

  if (left.length >= 4 && right.length >= 4 && (left.includes(right) || right.includes(left))) {
    return 0.72;
  }

  return 0;
}

function findLearnedClassification(description: string, learnedClassifications: LearnedClassification[]) {
  const tokens = Array.from(descriptionTokens(description));
  let bestMatch: { score: number; systemName: string; categoryName: string } | null = null;

  for (const learnedClassification of learnedClassifications) {
    const learnedDescription = learnedClassification.item_description;
    const systemName = learnedClassification.user_corrected_category || learnedClassification.final_category;
    const categoryName = learnedClassification.user_corrected_subcategory || learnedClassification.final_subcategory;

    if (!learnedDescription || !systemName || !categoryName) {
      continue;
    }

    const learnedTokens = Array.from(descriptionTokens(learnedDescription));
    const directHits = tokens.filter((token) => learnedTokens.includes(token)).length;
    const fuzzyHits = tokens.reduce((total, token) => {
      const bestTokenScore = learnedTokens.reduce((best, learnedToken) => Math.max(best, tokenSimilarity(token, learnedToken)), 0);

      return total + bestTokenScore;
    }, 0);
    const coverage = tokens.length > 0 ? Math.max(directHits, fuzzyHits) / tokens.length : 0;
    const reverseCoverage = learnedTokens.length > 0 ? directHits / learnedTokens.length : 0;
    const score = Math.max(coverage, reverseCoverage);

    if (
      description.toLowerCase().includes(learnedDescription.toLowerCase()) ||
      learnedDescription.toLowerCase().includes(description.toLowerCase())
    ) {
      bestMatch = { categoryName, score: 1, systemName };
      continue;
    }

    if (!bestMatch || score > bestMatch.score) {
      bestMatch = { categoryName, score, systemName };
    }
  }

  if (!bestMatch || bestMatch.score < 0.34) {
    return null;
  }

  return {
    categoryName: bestMatch.categoryName,
    confidenceScore: Math.min(0.92, 0.72 + bestMatch.score * 0.2),
    supplierType: "Learned supplier",
    systemName: bestMatch.systemName,
  };
}

async function getLearnedClassifications(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
) {
  const { data, error } = await supabase
    .from("ai_training_data")
    .select("item_description, final_category, final_subcategory, user_corrected_category, user_corrected_subcategory")
    .eq("user_id", userId)
    .not("item_description", "is", null)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    console.error(`Failed reading learned classifications: ${error.message}`);
    return [];
  }

  return (data || []) as LearnedClassification[];
}

function selectHeaderMatch(rows: unknown[][], mapping?: ColumnMapping | null) {
  return rows.slice(0, 50).map((row, index) => {
    const rowValues = Array.isArray(row) ? row : [];
    const descriptionColumn =
      mapping?.description ? findMappedColumn(rowValues, mapping.description) : findColumn(rowValues, descriptionHeaders);
    const quantityColumn =
      mapping?.quantity ? findMappedColumn(rowValues, mapping.quantity) : findColumn(rowValues, quantityHeaders);
    const unitColumn = mapping?.unit ? findMappedColumn(rowValues, mapping.unit) : findColumn(rowValues, unitHeaders);
    const rateColumn = mapping?.rate ? findMappedColumn(rowValues, mapping.rate) : findColumn(rowValues, rateHeaders);
    const amountColumn = mapping?.amount ? findMappedColumn(rowValues, mapping.amount) : findColumn(rowValues, amountHeaders);
    const score =
      (descriptionColumn >= 0 ? 4 : 0) +
      (quantityColumn >= 0 ? 2 : 0) +
      (unitColumn >= 0 ? 1 : 0) +
      (rateColumn >= 0 ? 1 : 0) +
      (amountColumn >= 0 ? 1 : 0);

    return {
      index,
      descriptionColumn,
      quantityColumn,
      unitColumn,
      rateColumn,
      amountColumn,
      score,
    };
  }).sort((a, b) => b.score - a.score)[0];
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
    blankrows: false,
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
  const knownHeader = inferClassificationFromExcelContext(null, text);

  return visualHeader || compactHeader || Boolean(knownHeader && knownHeader.systemName !== NEEDS_REVIEW_SYSTEM);
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
  const inheritedClassification = inferClassificationFromExcelContext(sheetName, currentSectionHeader);

  return {
    amount,
    description,
    inherited_category: inheritedClassification?.categoryName || null,
    inherited_subcategory: inheritedClassification?.subcategoryName || currentSectionHeader || null,
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

  const descriptionColumn = [...columnScores]
    .filter((column) => column.textCount > 0)
    .sort((a, b) => b.totalTextLength - a.totalTextLength)[0]?.columnIndex ?? -1;
  const numericColumns = columnScores
    .filter((column) => column.numericCount > 0)
    .sort((a, b) => b.numericCount - a.numericCount)
    .map((column) => column.columnIndex)
    .filter((columnIndex) => columnIndex !== descriptionColumn);
  const unitColumn = [...columnScores]
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

async function parseBoqWorkbook(source: Blob, mapping?: ColumnMapping | null) {
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

        if (
          fullRowText &&
          looksLikeSectionHeader({
            amount,
            description: fullRowText,
            maxColumns,
            quantity,
            rate,
            row,
            rowIndex,
            sheet,
            unit,
          })
        ) {
          currentSectionHeader = fullRowText;
          parsedRows.push({
            amount: null,
            cleanup_reason: "Section header used as inherited classification context.",
            description: fullRowText,
            inherited_category: inferClassificationFromExcelContext(sheetName, currentSectionHeader)?.categoryName || null,
            inherited_subcategory: inferClassificationFromExcelContext(sheetName, currentSectionHeader)?.subcategoryName || null,
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

        parsedRows.push(buildParsedBoqRow({
          amount,
          currentSectionHeader,
          description,
          quantity,
          rate,
          rowNumber: inferred.rowStartIndex + index + 1,
          sheetName,
          unit,
        }));
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

      if (
        fullRowText &&
        looksLikeSectionHeader({
          amount,
          description: fullRowText,
          maxColumns,
          quantity,
          rate,
          row,
          rowIndex,
          sheet,
          unit,
        })
      ) {
        currentSectionHeader = fullRowText;
        const inheritedClassification = inferClassificationFromExcelContext(sheetName, currentSectionHeader);

        parsedRows.push({
          amount: null,
          cleanup_reason: "Section header used as inherited classification context.",
          description: fullRowText,
          inherited_category: inheritedClassification?.categoryName || null,
          inherited_subcategory: inheritedClassification?.subcategoryName || null,
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

      parsedRows.push(buildParsedBoqRow({
        amount,
        currentSectionHeader,
        description,
        quantity,
        unit,
        rate,
        sheetName,
        rowNumber: headerRowIndex + index + 2,
      }));
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

async function getAuthenticatedUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return { supabase, user, error };
}

async function getProjectColumnMapping(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  projectId: string,
  userId: string,
) {
  const { data, error } = await supabase
    .from("project_boq_column_mappings")
    .select("description_column, quantity_column, unit_column, rate_column, amount_column")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    description: data.description_column,
    quantity: data.quantity_column,
    unit: data.unit_column,
    rate: data.rate_column,
    amount: data.amount_column,
  } satisfies ColumnMapping;
}

async function saveParsedBoqRows({
  projectFileId,
  projectId,
  rows,
  supabase,
  userId,
}: {
  projectFileId: string;
  projectId: string;
  rows: ParsedBoqRow[];
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  userId: string;
}) {
  const normalizedRows = normalizeParsedBoqRows(rows);
  const buildBoqRows = ({ fileColumns, optionalColumns }: BoqInsertMode) =>
    normalizedRows.map((row) => {
      const rowType = row.row_type || "item";
      const prediction =
        rowType === "item"
          ? predictClassification(row)
          : ({
              classification_reason: row.cleanup_reason || "Cleanup marked this row as non-item.",
              classification_source: "needs_review",
              confidence_score: 0,
              needs_review: false,
              predicted_classification_subcategory: null,
              predicted_category: "Ignored",
              predicted_subcategory: rowType,
              predicted_supplier_type: "Not applicable",
            } satisfies ClassificationPrediction);
      const payload: Record<string, unknown> = {
        project_id: projectId,
        user_id: userId,
        description: row.description,
        quantity: row.quantity ?? 0,
        unit: row.unit || "",
        sheet_name: row.sheet_name,
        row_number: row.row_number,
      };

      if (optionalColumns === "full") {
        payload.rate = row.rate;
        payload.amount = row.amount;
        payload.category = prediction.predicted_category;
        payload.subcategory = prediction.predicted_subcategory;
        payload.classification_subcategory = prediction.predicted_classification_subcategory;
        payload.confidence_score = prediction.confidence_score;
        payload.classification_reason = prediction.classification_reason;
        payload.classification_source = prediction.classification_source;
        payload.classification_status = prediction.needs_review ? "needs_review" : "classified";
        payload.cleanup_reason = row.cleanup_reason;
        payload.inherited_category = row.inherited_category;
        payload.inherited_subcategory = row.inherited_subcategory;
        payload.needs_review = prediction.needs_review;
        payload.row_type = rowType;
        payload.section_header = row.section_header;
        payload.source_row_number = row.source_row_number || row.row_number;
        payload.source_sheet_name = row.source_sheet_name || row.sheet_name;
      }

      if (fileColumns === "both" || fileColumns === "project_file_id") {
        payload.project_file_id = projectFileId;
      }

      if (fileColumns === "both" || fileColumns === "source_file_id") {
        payload.source_file_id = projectFileId;
      }

      return payload;
    });

  const insertAttempts: BoqInsertMode[] = [
    { fileColumns: "both", optionalColumns: "full" },
    { fileColumns: "source_file_id", optionalColumns: "full" },
    { fileColumns: "project_file_id", optionalColumns: "full" },
    { fileColumns: "none", optionalColumns: "full" },
    { fileColumns: "project_file_id", optionalColumns: "legacy" },
    { fileColumns: "none", optionalColumns: "legacy" },
  ];
  let boqInsertError: string | null = null;

  for (const insertMode of insertAttempts) {
    const { error: boqError } = await supabase.from("boq_items").insert(buildBoqRows(insertMode));

    if (!boqError) {
      boqInsertError = null;
      break;
    }

    boqInsertError = boqError.message;
    const canRetrySchemaFallback =
      boqError.message.includes("schema cache") ||
      boqError.message.includes("source_file_id") ||
      boqError.message.includes("project_file_id") ||
      boqError.message.includes("rate") ||
      boqError.message.includes("amount") ||
      boqError.message.includes("category") ||
      boqError.message.includes("subcategory") ||
      boqError.message.includes("classification_subcategory") ||
      boqError.message.includes("classification_reason") ||
      boqError.message.includes("classification_source") ||
      boqError.message.includes("classification_status") ||
      boqError.message.includes("cleanup_reason") ||
      boqError.message.includes("inherited_category") ||
      boqError.message.includes("inherited_subcategory") ||
      boqError.message.includes("needs_review") ||
      boqError.message.includes("row_type") ||
      boqError.message.includes("section_header") ||
      boqError.message.includes("source_row_number") ||
      boqError.message.includes("source_sheet_name") ||
      boqError.message.includes("confidence_score");

    if (!canRetrySchemaFallback) {
      break;
    }
  }

  if (boqInsertError) {
    return boqInsertError;
  }

  const itemRows = normalizedRows.filter((row) => row.row_type === "item");

  if (itemRows.length === 0) {
    return null;
  }

  const { error: learningError } = await supabase.from("ai_training_data").insert(
    itemRows.map((row) => {
      const prediction = predictClassification(row);

      return {
        project_id: projectId,
        source_file_id: projectFileId,
        user_id: userId,
        source_type: "boq_item",
        source_id: projectFileId,
        item_description: row.description,
        predicted_category: prediction.predicted_category,
        predicted_subcategory: prediction.predicted_subcategory,
        predicted_supplier_type: prediction.predicted_supplier_type,
        confidence_score: prediction.confidence_score,
        final_category: prediction.predicted_category,
        final_subcategory: prediction.predicted_subcategory,
        input: {
          description: row.description,
          quantity: row.quantity,
          unit: row.unit,
          rate: row.rate,
          amount: row.amount,
          sheet_name: row.sheet_name,
          row_number: row.row_number,
        },
        output: prediction,
      };
    }),
  );

  if (learningError) {
    console.error(`Failed creating ai_training_data records: ${learningError.message}`);
  }

  return null;
}

async function deleteParsedBoqRowsForFile({
  projectFileId,
  projectId,
  supabase,
  userId,
}: {
  projectFileId: string;
  projectId: string;
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  userId: string;
}) {
  const deleteAttempts = [
    () =>
      supabase
        .from("boq_items")
        .delete()
        .eq("project_id", projectId)
        .eq("user_id", userId)
        .or(`source_file_id.eq.${projectFileId},project_file_id.eq.${projectFileId}`),
    () =>
      supabase
        .from("boq_items")
        .delete()
        .eq("project_id", projectId)
        .eq("user_id", userId)
        .eq("source_file_id", projectFileId),
    () =>
      supabase
        .from("boq_items")
        .delete()
        .eq("project_id", projectId)
        .eq("user_id", userId)
        .eq("project_file_id", projectFileId),
  ];

  for (const deleteAttempt of deleteAttempts) {
    const { error } = await deleteAttempt();

    if (!error) {
      return;
    }

    console.error(`Failed deleting existing parsed BOQ rows before parse: ${error.message}`);
  }
}

export async function createProject(formData: FormData) {
  const name = readString(formData, "name");
  const client = readString(formData, "client");
  const location = readString(formData, "location");
  const workType = readString(formData, "work_type");
  const notes = readString(formData, "notes");

  if (!name || !client || !location || !workType) {
    redirect("/projects/new?error=Project%20name%2C%20client%2C%20location%2C%20and%20industry%20%2F%20work%20type%20are%20required.");
  }

  const { supabase, user, error: userError } = await getAuthenticatedUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id: user.id,
      name,
      client,
      location,
      work_type: workType,
      notes,
    })
    .select("id")
    .single();

  if (error) {
    redirect(`/projects/new?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard");
  revalidatePath("/projects");
  redirect(`/projects/${data.id}`);
}

export async function uploadProjectDocument(formData: FormData) {
  const projectId = readString(formData, "project_id");
  const documentTypeValue = readString(formData, "document_type");
  const file = formData.get("file");
  const documentType = documentTypes.includes(documentTypeValue as DocumentType)
    ? (documentTypeValue as DocumentType)
    : "Other";

  if (!projectId) {
    return { ok: false, error: "Missing project id." } satisfies ProjectDocumentActionResult;
  }

  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose a BOQ or tender document to upload." } satisfies ProjectDocumentActionResult;
  }

  const extension = getFileExtension(file.name);

  if (!allowedExtensions.includes(extension)) {
    return { ok: false, error: "Only .xlsx, .xls, and .pdf files are supported." } satisfies ProjectDocumentActionResult;
  }

  const { supabase, user, error: userError } = await getAuthenticatedUser();

  if (userError || !user) {
    return { ok: false, error: "Sign in to upload project documents." } satisfies ProjectDocumentActionResult;
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (projectError || !project) {
    return { ok: false, error: projectError?.message || "Project not found." } satisfies ProjectDocumentActionResult;
  }

  const storagePath = `${user.id}/${projectId}/${crypto.randomUUID()}-${sanitizeFileName(file.name)}`;
  const { error: uploadError } = await supabase.storage.from("project-documents").upload(storagePath, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });

  if (uploadError) {
    return { ok: false, error: uploadError.message } satisfies ProjectDocumentActionResult;
  }

  const { data: projectFile, error: insertError } = await supabase
    .from("project_files")
    .insert({
      project_id: projectId,
      user_id: user.id,
      file_name: file.name,
      file_type: extension.replace(".", ""),
      file_size: file.size,
      storage_path: storagePath,
      document_type: documentType,
    })
    .select("id")
    .single();

  if (insertError) {
    await supabase.storage.from("project-documents").remove([storagePath]);
    return { ok: false, error: insertError.message } satisfies ProjectDocumentActionResult;
  }

  if (extension === ".xlsx" || extension === ".xls") {
    let rows: ParsedBoqRow[];
    const savedMapping = await getProjectColumnMapping(supabase, projectId, user.id);

    try {
      rows = await parseBoqWorkbook(file, savedMapping);
    } catch (error) {
      if (error instanceof MappingRequiredError) {
        return {
          ok: false,
          error: error.message,
          needsMapping: true,
          mappingColumns: error.columns,
          projectFileId: projectFile.id,
        } satisfies ProjectDocumentActionResult;
      }

      return actionError(error, "Excel parsing failed.");
    }

    if (rows.length > 0) {
      const saveError = await saveParsedBoqRows({
        projectFileId: projectFile.id,
        projectId,
        rows,
        supabase,
        userId: user.id,
      });

      if (saveError) {
        return { ok: false, error: saveError } satisfies ProjectDocumentActionResult;
      }
    }
  }

  revalidatePath(`/projects/${projectId}`);
  return { ok: true, message: "File uploaded successfully." } satisfies ProjectDocumentActionResult;
}

export async function saveBoqColumnMappingAndParse(formData: FormData) {
  const projectId = readString(formData, "project_id");
  const projectFileId = readString(formData, "project_file_id");
  const mapping = {
    description: readString(formData, "description_column"),
    quantity: readString(formData, "quantity_column") || null,
    unit: readString(formData, "unit_column") || null,
    rate: readString(formData, "rate_column") || null,
    amount: readString(formData, "amount_column") || null,
  } satisfies ColumnMapping;

  if (!projectId || !projectFileId || !mapping.description) {
    return { ok: false, error: "Choose at least a Description column." } satisfies ProjectDocumentActionResult;
  }

  const { supabase, user, error: userError } = await getAuthenticatedUser();

  if (userError || !user) {
    return { ok: false, error: "Sign in to save BOQ column mapping." } satisfies ProjectDocumentActionResult;
  }

  const { data: projectFile, error: fileError } = await supabase
    .from("project_files")
    .select("id, storage_path")
    .eq("id", projectFileId)
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fileError || !projectFile) {
    return { ok: false, error: fileError?.message || "Uploaded file not found." } satisfies ProjectDocumentActionResult;
  }

  const { error: mappingError } = await supabase.from("project_boq_column_mappings").upsert(
    {
      project_id: projectId,
      user_id: user.id,
      description_column: mapping.description,
      quantity_column: mapping.quantity,
      unit_column: mapping.unit,
      rate_column: mapping.rate,
      amount_column: mapping.amount,
    },
    { onConflict: "project_id" },
  );

  if (mappingError) {
    console.error(`Failed saving BOQ column mapping: ${mappingError.message}`);
  }

  const { data: blob, error: downloadError } = await supabase.storage
    .from("project-documents")
    .download(projectFile.storage_path);

  if (downloadError || !blob) {
    return { ok: false, error: downloadError?.message || "Could not download uploaded workbook." } satisfies ProjectDocumentActionResult;
  }

  let rows: ParsedBoqRow[];

  try {
    rows = await parseBoqWorkbook(blob, mapping);
  } catch (error) {
    return actionError(error, "Excel parsing failed with the selected mapping.");
  }

  await deleteParsedBoqRowsForFile({
    projectFileId,
    projectId,
    supabase,
    userId: user.id,
  });

  const saveError = await saveParsedBoqRows({
    projectFileId,
    projectId,
    rows,
    supabase,
    userId: user.id,
  });

  if (saveError) {
    return { ok: false, error: saveError } satisfies ProjectDocumentActionResult;
  }

  revalidatePath(`/projects/${projectId}`);
  return { ok: true, message: "Column mapping saved and BOQ parsed." } satisfies ProjectDocumentActionResult;
}

export async function parseExistingProjectFile(formData: FormData) {
  const projectId = readString(formData, "project_id");
  const projectFileId = readString(formData, "project_file_id");

  if (!projectId || !projectFileId) {
    return { ok: false, error: "Missing file parse details." } satisfies ProjectDocumentActionResult;
  }

  const { supabase, user, error: userError } = await getAuthenticatedUser();

  if (userError || !user) {
    return { ok: false, error: "Sign in to parse project documents." } satisfies ProjectDocumentActionResult;
  }

  const { data: projectFile, error: fileError } = await supabase
    .from("project_files")
    .select("id, file_type, storage_path")
    .eq("id", projectFileId)
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fileError || !projectFile) {
    return { ok: false, error: fileError?.message || "Uploaded file not found." } satisfies ProjectDocumentActionResult;
  }

  if (!["xlsx", "xls"].includes(String(projectFile.file_type || "").toLowerCase())) {
    return { ok: false, error: "Only Excel BOQ files can be parsed." } satisfies ProjectDocumentActionResult;
  }

  const { data: blob, error: downloadError } = await supabase.storage
    .from("project-documents")
    .download(projectFile.storage_path);

  if (downloadError || !blob) {
    return { ok: false, error: downloadError?.message || "Could not download uploaded workbook." } satisfies ProjectDocumentActionResult;
  }

  const savedMapping = await getProjectColumnMapping(supabase, projectId, user.id);
  let rows: ParsedBoqRow[];

  try {
    rows = await parseBoqWorkbook(blob, savedMapping);
  } catch (error) {
    if (error instanceof MappingRequiredError) {
      return {
        ok: false,
        error: error.message,
        needsMapping: true,
        mappingColumns: error.columns,
        projectFileId,
      } satisfies ProjectDocumentActionResult;
    }

    return actionError(error, "Excel parsing failed.");
  }

  await deleteParsedBoqRowsForFile({
    projectFileId,
    projectId,
    supabase,
    userId: user.id,
  });

  const saveError = await saveParsedBoqRows({
    projectFileId,
    projectId,
    rows,
    supabase,
    userId: user.id,
  });

  if (saveError) {
    return { ok: false, error: saveError } satisfies ProjectDocumentActionResult;
  }

  revalidatePath(`/projects/${projectId}`);
  return { ok: true, message: "BOQ parsed successfully." } satisfies ProjectDocumentActionResult;
}

async function getSystemReferenceMaps({
  classifications,
  projectId,
  supabase,
  userId,
}: {
  classifications: Array<{ categoryName: string; systemName: string }>;
  projectId: string;
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  userId: string;
}) {
  const systemNames = Array.from(new Set(classifications.map((classification) => classification.systemName)));
  const systemIdsByName = new Map<string, string>();
  const categoryIdsByKey = new Map<string, string>();

  if (systemNames.length === 0) {
    return { categoryIdsByKey, systemIdsByName };
  }

  const { data: systems, error: systemsError } = await supabase
    .from("project_systems")
    .upsert(
      systemNames.map((name, index) => ({
        name,
        project_id: projectId,
        sort_order: index,
        user_id: userId,
      })),
      { onConflict: "project_id,name" },
    )
    .select("id, name");

  if (systemsError || !systems) {
    if (systemsError) {
      console.error(`Failed upserting project systems: ${systemsError.message}`);
    }

    return { categoryIdsByKey, systemIdsByName };
  }

  for (const system of systems as Array<{ id: string; name: string }>) {
    systemIdsByName.set(system.name, system.id);
  }

  const categoryRows = classifications
    .map((classification) => {
      const systemId = systemIdsByName.get(classification.systemName);

      if (!systemId) {
        return null;
      }

      return {
        name: classification.categoryName,
        project_id: projectId,
        system_id: systemId,
        user_id: userId,
      };
    })
    .filter((row): row is { name: string; project_id: string; system_id: string; user_id: string } => Boolean(row));
  const uniqueCategoryRows = Array.from(
    new Map(categoryRows.map((row) => [`${row.system_id}:${row.name}`, row])).values(),
  );

  if (uniqueCategoryRows.length === 0) {
    return { categoryIdsByKey, systemIdsByName };
  }

  const { data: categories, error: categoriesError } = await supabase
    .from("project_system_categories")
    .upsert(uniqueCategoryRows, { onConflict: "system_id,name" })
    .select("id, name, system_id");

  if (categoriesError || !categories) {
    if (categoriesError) {
      console.error(`Failed upserting project system categories: ${categoriesError.message}`);
    }

    return { categoryIdsByKey, systemIdsByName };
  }

  for (const category of categories as Array<{ id: string; name: string; system_id: string }>) {
    categoryIdsByKey.set(`${category.system_id}:${category.name}`, category.id);
  }

  return { categoryIdsByKey, systemIdsByName };
}

async function updateBoqItemClassification({
  categoryId,
  classification,
  row,
  supabase,
  systemId,
  needsReviewOverride,
}: {
  categoryId?: string;
  classification: SystemClassification;
  needsReviewOverride?: boolean;
  row: BoqClassificationRow;
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  systemId?: string;
}) {
  const takeoffQuantity = row.quantity === null || row.quantity === undefined ? null : Number(row.quantity || 0);
  const takeoffUnit = normalizeTakeoffUnit(row.unit);
  const classificationSource =
    classification.source || (classification.systemName === NEEDS_REVIEW_SYSTEM ? "needs_review" : "rules");
  const needsReview =
    needsReviewOverride ??
    (classification.systemName === NEEDS_REVIEW_SYSTEM || classificationSource === "needs_review");
  const basePayload = {
    category: classification.systemName,
    classification_subcategory: classification.subcategoryName || null,
    confidence_score: classification.confidenceScore,
    subcategory: classification.categoryName,
  };
  const updateAttempts: Array<Record<string, unknown>> = [
    {
      ...basePayload,
      classification_confidence: classification.confidenceScore,
      classification_reason: classification.reason || null,
      classification_source: classificationSource,
      classification_status: needsReview ? "needs_review" : "classified",
      needs_review: needsReview,
      system_category_id: categoryId || null,
      system_id: systemId || null,
      takeoff_quantity: takeoffQuantity,
      takeoff_unit: takeoffUnit,
      updated_at: new Date().toISOString(),
    },
    {
      ...basePayload,
      classification_confidence: classification.confidenceScore,
      classification_reason: classification.reason || null,
      classification_source: classificationSource,
      classification_status: needsReview ? "needs_review" : "classified",
      needs_review: needsReview,
      takeoff_quantity: takeoffQuantity,
      takeoff_unit: takeoffUnit,
    },
    basePayload,
    {
      category: classification.systemName,
      subcategory: classification.categoryName,
    },
  ];
  let lastError: string | null = null;

  for (const payload of updateAttempts) {
    const { error } = await supabase.from("boq_items").update(payload).eq("id", row.id);

    if (!error) {
      return null;
    }

    lastError = error.message;
    const canRetrySchemaFallback =
      error.message.includes("schema cache") ||
      error.message.includes("classification_confidence") ||
      error.message.includes("classification_status") ||
      error.message.includes("system_category_id") ||
      error.message.includes("system_id") ||
      error.message.includes("takeoff_quantity") ||
      error.message.includes("takeoff_unit") ||
      error.message.includes("classification_subcategory") ||
      error.message.includes("classification_source") ||
      error.message.includes("classification_reason") ||
      error.message.includes("needs_review") ||
      error.message.includes("updated_at") ||
      error.message.includes("confidence_score");

    if (!canRetrySchemaFallback) {
      break;
    }
  }

  return lastError || "Unable to update BOQ item classification.";
}

export async function classifyProjectBoqItems(formData: FormData) {
  try {
    return await classifyProjectBoqItemsUnsafe(formData);
  } catch (error) {
    console.error(error);
    return actionError(error, "Classification failed.");
  }
}

async function classifyProjectBoqItemsUnsafe(formData: FormData) {
  const projectId = readString(formData, "project_id");

  if (!projectId) {
    return { ok: false, error: "Missing project id." } satisfies ProjectDocumentActionResult;
  }

  const { supabase, user, error: userError } = await getAuthenticatedUser();

  if (userError || !user) {
    return { ok: false, error: "Sign in to classify BOQ items." } satisfies ProjectDocumentActionResult;
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (projectError || !project) {
    return { ok: false, error: projectError?.message || "Project not found." } satisfies ProjectDocumentActionResult;
  }

  const boqResult = await supabase
    .from("boq_items")
      .select(
      "id, description, quantity, unit, amount, category, subcategory, classification_subcategory, classification_confidence, classification_reason, classification_source, needs_review, row_type, source_sheet_name, source_row_number, section_header, inherited_category, inherited_subcategory",
    )
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .eq("row_type", "item");
  let data: unknown[] | null = boqResult.data;
  let error = boqResult.error;

  if (
    error &&
    (error.message.includes("schema cache") ||
      error.message.includes("row_type") ||
      error.message.includes("amount") ||
      error.message.includes("category") ||
      error.message.includes("subcategory") ||
      error.message.includes("classification_subcategory") ||
      error.message.includes("classification_confidence") ||
      error.message.includes("classification_reason") ||
      error.message.includes("classification_source") ||
      error.message.includes("needs_review") ||
      error.message.includes("source_sheet_name") ||
      error.message.includes("source_row_number") ||
      error.message.includes("section_header") ||
      error.message.includes("inherited_category") ||
      error.message.includes("inherited_subcategory"))
  ) {
    if (error.message.includes("row_type")) {
      return {
        ok: false,
        error: "BOQ cleanup migration is required before classification can run.",
      } satisfies ProjectDocumentActionResult;
    }

    const fallbackResult = await supabase
      .from("boq_items")
      .select("id, description, quantity, unit, row_type")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .eq("row_type", "item");

    data = fallbackResult.data;
    error = fallbackResult.error;
  }

  if (error) {
    return { ok: false, error: error.message } satisfies ProjectDocumentActionResult;
  }

  const rows = ((data || []) as BoqClassificationRow[]).filter((row) => !row.row_type || row.row_type === "item");

  if (rows.length === 0) {
    return {
      ok: false,
      error: "No item rows found. BOQ cleanup marked all parsed rows as headers, totals, notes, or ignored.",
    } satisfies ProjectDocumentActionResult;
  }

  const learnedClassifications = await getLearnedClassifications(supabase, user.id);
  const classificationSources: Array<{ classification: SystemClassification; source: ClassificationSource }> = rows.map((row) => {
    const learnedClassification = findLearnedClassification(row.description, learnedClassifications);
    const persistedSource = isClassificationSource(row.classification_source) ? row.classification_source : null;

    if (learnedClassification) {
      return {
        classification: {
          ...learnedClassification,
          reason: "Matched a previous user correction.",
          source: "learned",
        } satisfies SystemClassification,
        source: "learned",
      };
    }

    if (
      (persistedSource === "learned" || persistedSource === "ai" || persistedSource === "inherited_header") &&
      row.category &&
      row.subcategory &&
      !row.needs_review &&
      Number(row.classification_confidence || 0) >= 0.7
    ) {
      return {
        classification: {
          categoryName: row.subcategory,
          confidenceScore: Number(row.classification_confidence || 0.8),
          reason:
            row.classification_reason ||
            (persistedSource === "learned" ? "User confirmed this classification." : "Previously classified by AI."),
          source: persistedSource,
          subcategoryName: row.classification_subcategory || null,
          supplierType: classifyBoqSystem(row.description, row.category, row.subcategory, row.classification_subcategory).supplierType,
          systemName: row.category,
        } satisfies SystemClassification,
        source: persistedSource,
      };
    }

    const inheritedClassification = inferClassificationFromExcelContext(row.source_sheet_name, row.section_header);
    const localClassification =
      learnedClassification ||
      inheritedClassification ||
      classifyBoqSystem(row.description, row.category, row.subcategory, row.classification_subcategory);
    const source: ClassificationSource =
      localClassification.source || (localClassification.systemName === NEEDS_REVIEW_SYSTEM ? "needs_review" : "rules");

    return {
      classification: {
        ...localClassification,
        reason:
          source === "needs_review"
              ? "Local classifier could not confidently map this item."
              : source === "inherited_header"
                ? "Inherited from sheet and section header."
              : "Matched local classification rules.",
        source,
      } satisfies SystemClassification,
      source,
    };
  });
  const classifications = classificationSources.map((classificationSource) => classificationSource.classification);
  const learnedRowIds = new Set(
    rows
      .map((row, index) => (classificationSources[index].source === "learned" ? row.id : null))
      .filter((rowId): rowId is string => Boolean(rowId)),
  );
  const touchedAiRowIds = new Set<string>();
  let aiClassifiedCount = 0;
  let aiError: string | null = null;

  if (isAiClassificationConfigured()) {
    const allAiCandidates = rows
      .map((row, index) => ({ classification: classifications[index], index, row, source: classificationSources[index].source }))
      .filter(
        (candidate) =>
          candidate.source !== "learned" &&
          candidate.source !== "ai" &&
          (candidate.classification.systemName === NEEDS_REVIEW_SYSTEM || candidate.classification.confidenceScore < 0.7),
      );
    const aiCandidates = allAiCandidates.slice(0, MAX_AI_CLASSIFICATION_ITEMS_PER_RUN);
    const skippedAiCandidateCount = allAiCandidates.length - aiCandidates.length;

    console.log(
      `BOQ AI classification fallback: ${aiCandidates.length} item(s), ${Math.ceil(
        aiCandidates.length / AI_CLASSIFICATION_BATCH_SIZE,
      )} batch(es), ${skippedAiCandidateCount} deferred.`,
    );

    for (let index = 0; index < aiCandidates.length; index += AI_CLASSIFICATION_BATCH_SIZE) {
      const batch = aiCandidates.slice(index, index + AI_CLASSIFICATION_BATCH_SIZE);
      const result = await classifyBoqItemsWithAi(
        batch.map((candidate) => ({
          currentCategory: candidate.row.subcategory,
          currentSubcategory: candidate.row.classification_subcategory,
          currentSystem: candidate.row.category,
          description: candidate.row.description,
          id: candidate.row.id,
          quantity: candidate.row.quantity,
          unit: candidate.row.unit,
        })),
      );

      if (result.error) {
        aiError ||= result.error;
        console.error(`BOQ AI classification batch failed: ${result.error}`);
      }

      for (const candidate of batch) {
        touchedAiRowIds.add(candidate.row.id);
        const aiClassification = result.classifications.get(candidate.row.id);

        if (!aiClassification) {
          continue;
        }

        const currentClassification = classifications[candidate.index];
        const aiIsUseful =
          currentClassification.source !== "learned" && currentClassification.confidenceScore < 0.7;

        if (aiIsUseful) {
          classifications[candidate.index] = aiClassification;
          aiClassifiedCount += 1;
        }
      }
    }

    if (skippedAiCandidateCount > 0) {
      aiError ||= `${skippedAiCandidateCount} low-confidence items were deferred to keep this run fast. Run classification again to continue.`;
    }
  } else {
    aiError = "AI unavailable: OPENAI_API_KEY is not configured. Local fallback used.";
    console.log("BOQ AI classification skipped: OPENAI_API_KEY is not configured.");
  }
  const { categoryIdsByKey, systemIdsByName } = await getSystemReferenceMaps({
    classifications: rows
      .map((row, index) =>
        touchedAiRowIds.has(row.id) || learnedRowIds.has(row.id) ? classifications[index] : null,
      )
      .filter((classification): classification is SystemClassification => Boolean(classification)),
    projectId,
    supabase,
    userId: user.id,
  });
  let updatedCount = 0;
  let firstError: string | null = null;

  const rowsToUpdate =
    touchedAiRowIds.size > 0 || learnedRowIds.size > 0
      ? rows.filter((row) => touchedAiRowIds.has(row.id) || learnedRowIds.has(row.id))
      : rows;

  const updateJobs = rowsToUpdate.map((row) => {
    const rowIndex = rows.findIndex((candidate) => candidate.id === row.id);
    const classification = classifications[rowIndex];
    const systemId = systemIdsByName.get(classification.systemName);
    const categoryId = systemId ? categoryIdsByKey.get(`${systemId}:${classification.categoryName}`) : undefined;

    return {
      categoryId,
      classification,
      row,
      systemId,
    };
  });

  for (let index = 0; index < updateJobs.length; index += 25) {
    const batch = updateJobs.slice(index, index + 25);
    const results = await Promise.all(
      batch.map((job) =>
        updateBoqItemClassification({
          categoryId: job.categoryId,
          classification: job.classification,
          needsReviewOverride: job.classification.source === "learned" ? false : undefined,
          row: job.row,
          supabase,
          systemId: job.systemId,
        }),
      ),
    );

    for (const updateError of results) {
      if (updateError) {
        firstError ||= updateError;
        continue;
      }

      updatedCount += 1;
    }
  }

  if (updatedCount === 0) {
    return {
      ok: false,
      error: firstError || "Classification did not update any BOQ items.",
    } satisfies ProjectDocumentActionResult;
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/boq");
  revalidatePath("/learning");

  return {
    ok: true,
    message:
      updatedCount === rowsToUpdate.length
        ? `Classified ${updatedCount} BOQ items this run.${aiClassifiedCount > 0 ? ` AI classified ${aiClassifiedCount} items.` : ""}${aiError ? ` ${aiError}` : ""}`
        : `Classified ${updatedCount} of ${rowsToUpdate.length} queued BOQ items. ${firstError || ""} ${aiError || ""}`.trim(),
  } satisfies ProjectDocumentActionResult;
}

export async function correctBoqItemSystemClassification(formData: FormData) {
  try {
    const projectId = readString(formData, "project_id");
    const itemId = readString(formData, "item_id");
    const systemName = readString(formData, "system_name");
    const categoryName = readString(formData, "category_name");
    const subcategoryName = readString(formData, "subcategory_name") || getDefaultSubcategory(systemName, categoryName);
    const needsReview = readString(formData, "needs_review") === "true";

    if (!projectId || !itemId || !systemName || !categoryName) {
      return { ok: false, error: "Choose a system and category before saving." } satisfies ProjectDocumentActionResult;
    }

    const { supabase, user, error: userError } = await getAuthenticatedUser();

    if (userError || !user) {
      return { ok: false, error: "Sign in to classify BOQ items." } satisfies ProjectDocumentActionResult;
    }

    const { data: row, error: rowError } = await supabase
      .from("boq_items")
      .select("id, description, quantity, unit, amount, category, subcategory, classification_subcategory")
      .eq("id", itemId)
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (rowError || !row) {
      return { ok: false, error: rowError?.message || "BOQ item not found." } satisfies ProjectDocumentActionResult;
    }

    const previousClassification = classifyBoqSystem(
      (row as BoqClassificationRow).description,
      (row as BoqClassificationRow).category,
      (row as BoqClassificationRow).subcategory,
    );
    const classification = {
      categoryName,
      confidenceScore: 1,
      reason: "User confirmed this classification.",
      source: "learned" as const,
      subcategoryName,
      supplierType: "User corrected supplier",
      systemName,
    };
    const { categoryIdsByKey, systemIdsByName } = await getSystemReferenceMaps({
      classifications: [classification],
      projectId,
      supabase,
      userId: user.id,
    });
    const systemId = systemIdsByName.get(systemName);
    const categoryId = systemId ? categoryIdsByKey.get(`${systemId}:${categoryName}`) : undefined;
    const updateError = await updateBoqItemClassification({
      categoryId,
      classification,
      needsReviewOverride: needsReview,
      row: row as BoqClassificationRow,
      supabase,
      systemId,
    });

    if (updateError) {
      return { ok: false, error: updateError } satisfies ProjectDocumentActionResult;
    }

    const { error: learningError } = await supabase.from("ai_training_data").insert({
      project_id: projectId,
      user_id: user.id,
      source_type: "system_classification_correction",
      source_id: itemId,
      item_description: (row as BoqClassificationRow).description,
      predicted_category: (row as BoqClassificationRow).category || previousClassification.systemName,
      predicted_subcategory: (row as BoqClassificationRow).subcategory || previousClassification.categoryName,
      predicted_supplier_type: previousClassification.supplierType,
      confidence_score: previousClassification.confidenceScore,
      user_corrected_category: systemName,
      user_corrected_subcategory: categoryName,
      final_category: systemName,
      final_subcategory: categoryName,
      input: {
        description: (row as BoqClassificationRow).description,
        previous_category: (row as BoqClassificationRow).category,
        previous_subcategory: (row as BoqClassificationRow).subcategory,
      },
      output: {
        category: categoryName,
        subcategory: subcategoryName,
        system: systemName,
      },
      feedback: "User system classification correction",
    });

    if (learningError) {
      console.error(`Failed saving system classification learning record: ${learningError.message}`);
    }

    revalidatePath(`/projects/${projectId}`);
    revalidatePath("/boq");
    revalidatePath("/learning");

    return { ok: true, message: "Classification saved and remembered for future matches." } satisfies ProjectDocumentActionResult;
  } catch (error) {
    console.error(error);
    return actionError(error, "Classification correction failed.");
  }
}

type BulkManualClassificationChange = {
  categoryName: string;
  itemId: string;
  needsReview: boolean;
  subcategoryName: string | null;
  systemName: string;
};

function parseBulkManualClassificationChanges(formData: FormData) {
  const changesJson = readString(formData, "changes");

  if (changesJson) {
    try {
      const parsed = JSON.parse(changesJson) as Array<Partial<BulkManualClassificationChange>>;

      return parsed
        .map((change) => ({
          categoryName: String(change.categoryName || "").trim(),
          itemId: String(change.itemId || "").trim(),
          needsReview: Boolean(change.needsReview),
          subcategoryName: change.subcategoryName ? String(change.subcategoryName).trim() : null,
          systemName: String(change.systemName || "").trim(),
        }))
        .filter((change) => change.itemId && change.systemName && change.categoryName);
    } catch {
      return [];
    }
  }

  const systemName = readString(formData, "system_name");
  const categoryName = readString(formData, "category_name") || defaultCategoryForSystemName(systemName);
  const subcategoryName = readString(formData, "subcategory_name") || getDefaultSubcategory(systemName, categoryName);
  const needsReviewMode = readString(formData, "needs_review_mode");
  const needsReview = needsReviewMode === "mark";
  const itemIds = formData
    .getAll("item_ids")
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  return itemIds
    .map((itemId) => ({
      categoryName,
      itemId,
      needsReview,
      subcategoryName,
      systemName,
    }))
    .filter((change) => change.itemId && change.systemName && change.categoryName);
}

function defaultCategoryForSystemName(systemName: string) {
  return getSystemRuleOptions().find((option) => option.systemName === systemName)?.categoryName || NEEDS_REVIEW_CATEGORY;
}

export async function bulkCorrectBoqItemClassifications(formData: FormData) {
  try {
    const projectId = readString(formData, "project_id");
    const changes = parseBulkManualClassificationChanges(formData);

    if (!projectId || changes.length === 0) {
      return { ok: false, error: "Select BOQ items and choose a system/category before saving." } satisfies ProjectDocumentActionResult;
    }

    const { supabase, user, error: userError } = await getAuthenticatedUser();

    if (userError || !user) {
      return { ok: false, error: "Sign in to classify BOQ items." } satisfies ProjectDocumentActionResult;
    }

    const itemIds = Array.from(new Set(changes.map((change) => change.itemId)));
    const changesById = new Map(changes.map((change) => [change.itemId, change]));
    const { data: rows, error: rowsError } = await supabase
      .from("boq_items")
      .select("id, description, quantity, unit, amount, category, subcategory, classification_subcategory, source_file_id, project_file_id, row_type")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .eq("row_type", "item")
      .in("id", itemIds);

    if (rowsError) {
      return { ok: false, error: rowsError.message } satisfies ProjectDocumentActionResult;
    }

    const itemRows = ((rows || []) as BoqClassificationRow[]).filter((row) => row.row_type === "item");

    if (itemRows.length === 0) {
      return { ok: false, error: "No editable BOQ item rows were found." } satisfies ProjectDocumentActionResult;
    }

    const classifications = itemRows.map((row) => {
      const change = changesById.get(row.id);

      return {
        categoryName: change?.categoryName || NEEDS_REVIEW_CATEGORY,
        confidenceScore: 1,
        reason: "Manual bulk correction",
        source: "learned" as const,
        subcategoryName: change?.subcategoryName || null,
        supplierType: "User corrected supplier",
        systemName: change?.systemName || NEEDS_REVIEW_SYSTEM,
      } satisfies SystemClassification;
    });
    const { categoryIdsByKey, systemIdsByName } = await getSystemReferenceMaps({
      classifications,
      projectId,
      supabase,
      userId: user.id,
    });
    let updatedCount = 0;
    let firstError: string | null = null;

    for (let index = 0; index < itemRows.length; index += 25) {
      const batch = itemRows.slice(index, index + 25);
      const results = await Promise.all(
        batch.map((row) => {
          const rowIndex = itemRows.findIndex((candidate) => candidate.id === row.id);
          const classification = classifications[rowIndex];
          const change = changesById.get(row.id);
          const systemId = systemIdsByName.get(classification.systemName);
          const categoryId = systemId ? categoryIdsByKey.get(`${systemId}:${classification.categoryName}`) : undefined;

          return updateBoqItemClassification({
            categoryId,
            classification,
            needsReviewOverride: change?.needsReview ?? false,
            row,
            supabase,
            systemId,
          });
        }),
      );

      for (const updateError of results) {
        if (updateError) {
          firstError ||= updateError;
          continue;
        }

        updatedCount += 1;
      }
    }

    const learningRows = itemRows.map((row) => {
      const change = changesById.get(row.id);
      const previousClassification = classifyBoqSystem(row.description, row.category, row.subcategory);

      return {
        project_id: projectId,
        user_id: user.id,
        source_file_id: row.source_file_id || row.project_file_id || null,
        source_type: "bulk_system_classification_correction",
        source_id: row.id,
        item_description: row.description,
        predicted_category: row.category || previousClassification.systemName,
        predicted_subcategory: row.subcategory || previousClassification.categoryName,
        predicted_supplier_type: previousClassification.supplierType,
        confidence_score: previousClassification.confidenceScore,
        user_corrected_category: change?.systemName,
        user_corrected_subcategory: change?.categoryName,
        final_category: change?.systemName,
        final_subcategory: change?.categoryName,
        input: {
          description: row.description,
          previous_category: row.category,
          previous_subcategory: row.subcategory,
        },
        output: {
          category: change?.categoryName,
          needs_review: change?.needsReview,
          subcategory: change?.subcategoryName,
          system: change?.systemName,
        },
        feedback: "Manual bulk correction",
      };
    });
    const { error: learningError } = await supabase.from("ai_training_data").insert(learningRows);

    if (learningError) {
      console.error(`Failed saving bulk classification learning records: ${learningError.message}`);
    }

    revalidatePath(`/projects/${projectId}`);
    revalidatePath("/boq");
    revalidatePath("/learning");

    if (updatedCount === 0) {
      return { ok: false, error: firstError || "No BOQ items were updated." } satisfies ProjectDocumentActionResult;
    }

    return {
      ok: true,
      message:
        updatedCount === itemRows.length
          ? `Saved ${updatedCount} manual classification changes.`
          : `Saved ${updatedCount} of ${itemRows.length} manual classification changes. ${firstError || ""}`.trim(),
    } satisfies ProjectDocumentActionResult;
  } catch (error) {
    console.error(error);
    return actionError(error, "Bulk classification save failed.");
  }
}

export async function correctBoqClassification(formData: FormData) {
  const projectId = readString(formData, "project_id");
  const sourceFileId = readString(formData, "source_file_id");
  const itemDescription = readString(formData, "item_description");
  const predictedCategory = readString(formData, "predicted_category");
  const predictedSubcategory = readString(formData, "predicted_subcategory");
  const predictedSupplierType = readString(formData, "predicted_supplier_type");
  const confidenceScore = Number(readString(formData, "confidence_score") || 0);
  const correctedCategory = readString(formData, "user_corrected_category");
  const correctedSubcategory = readString(formData, "user_corrected_subcategory");

  if (!projectId || !sourceFileId || !itemDescription || !correctedCategory) {
    redirect(`/projects/${projectId || ""}?error=${encodeURIComponent("Choose a category before saving a correction.")}`);
  }

  const { supabase, user, error: userError } = await getAuthenticatedUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (projectError || !project) {
    redirect(`/projects/${projectId}?error=${encodeURIComponent(projectError?.message || "Project not found.")}`);
  }

  const finalSubcategory = correctedSubcategory || predictedSubcategory || "Unclassified";
  const { error } = await supabase.from("ai_training_data").insert({
    project_id: projectId,
    source_file_id: sourceFileId,
    user_id: user.id,
    source_type: "boq_item_correction",
    source_id: sourceFileId,
    item_description: itemDescription,
    predicted_category: predictedCategory || "General",
    predicted_subcategory: predictedSubcategory || "Unclassified",
    predicted_supplier_type: predictedSupplierType || "General supplier",
    confidence_score: Number.isFinite(confidenceScore) ? confidenceScore : null,
    user_corrected_category: correctedCategory,
    user_corrected_subcategory: correctedSubcategory || null,
    final_category: correctedCategory,
    final_subcategory: finalSubcategory,
    input: {
      description: itemDescription,
      previous_category: predictedCategory,
      previous_subcategory: predictedSubcategory,
    },
    output: {
      final_category: correctedCategory,
      final_subcategory: finalSubcategory,
    },
    feedback: "User classification correction",
  });

  if (error) {
    redirect(`/projects/${projectId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/learning");
  redirect(`/projects/${projectId}#boq`);
}

export async function deleteProjectFile(formData: FormData) {
  const projectId = readString(formData, "project_id");
  const fileId = readString(formData, "file_id");

  if (!projectId || !fileId) {
    return { ok: false, error: "Missing file deletion details." } satisfies ProjectDocumentActionResult;
  }

  const { supabase, user, error: userError } = await getAuthenticatedUser();

  if (userError || !user) {
    return { ok: false, error: "Sign in to delete project documents." } satisfies ProjectDocumentActionResult;
  }

  const { data: projectFile, error: fileError } = await supabase
    .from("project_files")
    .select("id, storage_path")
    .eq("id", fileId)
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fileError || !projectFile) {
    return { ok: false, error: fileError?.message || "File not found." } satisfies ProjectDocumentActionResult;
  }

  const { error: boqError } = await supabase
    .from("boq_items")
    .delete()
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .or(`source_file_id.eq.${fileId},project_file_id.eq.${fileId}`);

  if (boqError) {
    console.error(`Failed deleting boq_items: ${boqError.message}`);
  }

  const { error: fileDeleteError } = await supabase
    .from("project_files")
    .delete()
    .eq("id", fileId)
    .eq("project_id", projectId)
    .eq("user_id", user.id);

  if (fileDeleteError) {
    return deleteStepError("deleting project_files", fileDeleteError.message);
  }

  const { error: storageError } = await supabase.storage
    .from("project-documents")
    .remove([projectFile.storage_path]);

  if (storageError) {
    return deleteStepError("deleting storage object", storageError.message);
  }

  revalidatePath(`/projects/${projectId}`);
  return { ok: true, message: "File deleted successfully." } satisfies ProjectDocumentActionResult;
}
