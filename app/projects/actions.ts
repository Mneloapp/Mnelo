"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { classifyBoqItemsWithAi, isAiClassificationConfigured } from "@/lib/ai-classifier";
import {
  getBoqParserSummary,
  MappingRequiredError as SharedMappingRequiredError,
  normalizeParsedBoqRows as normalizeParsedBoqRowsShared,
  parseBoqWorkbook as parseBoqWorkbookShared,
  type BoqParserSummary,
} from "@/lib/boq-parser";
import type { BoqRowType } from "@/lib/boq-cleanup";
import {
  classifyBoqSystem,
  getSystemRuleOptions,
  inferClassificationFromExcelContext,
  isValidCategory,
  isValidSubcategory,
  isValidSystem,
  NEEDS_REVIEW_CATEGORY,
  NEEDS_REVIEW_SYSTEM,
  normalizeTakeoffUnit,
  type SystemClassification,
} from "@/lib/classification";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { DocumentType } from "@/lib/data";

const documentTypes = ["BOQ Excel", "Specification PDF", "Drawing PDF", "Other"] satisfies DocumentType[];
const allowedExtensions = [".xlsx", ".xls", ".pdf"];
const AI_CLASSIFICATION_BATCH_SIZE = 20;
const MAX_AI_CLASSIFICATION_ITEMS_PER_RUN = 80;
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
  fileColumns: "both" | "project_file_id" | "source_file_id";
  optionalColumns:
    | "basicClassification"
    | "contextOnly"
    | "full"
    | "legacy"
    | "withoutClassificationMeta"
    | "withoutClassificationStatus"
    | "withoutConfidence";
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
  row_number?: number | null;
  row_type?: BoqRowType | null;
  section_header?: string | null;
  sheet_name?: string | null;
  source_file_id?: string | null;
  source_row_number?: number | null;
  source_sheet_name?: string | null;
};

type PreservedManualClassification = {
  category: string;
  classificationReason: string | null;
  classificationSubcategory: string | null;
  confidenceScore: number;
  description: string;
  quantity: number | null;
  rowNumber: number | null;
  sheetName: string | null;
  subcategory: string;
  unit: string | null;
};

type ManualClassificationRestoreSet = {
  currentManualClassifications: PreservedManualClassification[];
  durableManualClassifications: PreservedManualClassification[];
};

type LearnedClassification = {
  final_classification_subcategory?: string | null;
  item_description: string | null;
  final_category?: string | null;
  final_subcategory?: string | null;
  final_system?: string | null;
  normalized_description?: string | null;
  output?: {
    category?: string | null;
    subcategory?: string | null;
    system?: string | null;
  } | null;
  quantity?: number | null;
  source_row_number?: number | null;
  source_sheet_name?: string | null;
  unit?: string | null;
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
  parserSummary?: BoqParserSummary;
  projectFileId?: string;
};

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

function normalizeFingerprintText(value?: string | number | null) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s./&-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeFingerprintQuantity(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "";
  }

  return Number(value).toFixed(4).replace(/\.?0+$/, "");
}

function boqRowStrictFingerprint(row: {
  description: string;
  quantity?: number | null;
  rowNumber?: number | null;
  sheetName?: string | null;
  unit?: string | null;
}) {
  return [
    normalizeFingerprintText(row.sheetName),
    normalizeFingerprintText(row.rowNumber),
    normalizeFingerprintText(row.description),
    normalizeFingerprintQuantity(row.quantity),
    normalizeFingerprintText(row.unit),
  ].join("|");
}

function boqRowContentFingerprint(row: { description: string; quantity?: number | null; unit?: string | null }) {
  return [
    normalizeFingerprintText(row.description),
    normalizeFingerprintQuantity(row.quantity),
    normalizeFingerprintText(row.unit),
  ].join("|");
}

function boqRowDescriptionUnitFingerprint(row: { description: string; unit?: string | null }) {
  return [normalizeFingerprintText(row.description), normalizeFingerprintText(row.unit)].join("|");
}

function buildPreservedManualClassificationMaps(preserved: PreservedManualClassification[]) {
  const strict = new Map<string, PreservedManualClassification>();
  const content = new Map<string, PreservedManualClassification>();
  const descriptionUnit = new Map<string, PreservedManualClassification>();
  const descriptionCounts = new Map<string, number>();
  const description = new Map<string, PreservedManualClassification>();

  for (const classification of preserved) {
    strict.set(boqRowStrictFingerprint(classification), classification);
    content.set(boqRowContentFingerprint(classification), classification);
    descriptionUnit.set(boqRowDescriptionUnitFingerprint(classification), classification);

    const descriptionFingerprint = normalizeFingerprintText(classification.description);
    descriptionCounts.set(descriptionFingerprint, (descriptionCounts.get(descriptionFingerprint) || 0) + 1);
    description.set(descriptionFingerprint, classification);
  }

  return { content, description, descriptionCounts, descriptionUnit, strict };
}

function findPreservedManualClassification(
  row: ParsedBoqRow,
  maps: ReturnType<typeof buildPreservedManualClassificationMaps>,
) {
  const fingerprintRow = {
    description: row.description,
    quantity: row.quantity,
    rowNumber: row.source_row_number || row.row_number,
    sheetName: row.source_sheet_name || row.sheet_name,
    unit: row.unit,
  };

  const descriptionFingerprint = normalizeFingerprintText(row.description);

  return (
    maps.strict.get(boqRowStrictFingerprint(fingerprintRow)) ||
    maps.content.get(boqRowContentFingerprint(fingerprintRow)) ||
    maps.descriptionUnit.get(boqRowDescriptionUnitFingerprint(fingerprintRow)) ||
    (maps.descriptionCounts.get(descriptionFingerprint) === 1 ? maps.description.get(descriptionFingerprint) : null) ||
    null
  );
}

function isStrongClassification(classification: SystemClassification | null | undefined) {
  return Boolean(
    classification &&
      classification.systemName !== NEEDS_REVIEW_SYSTEM &&
      classification.categoryName !== NEEDS_REVIEW_CATEGORY &&
      classification.subcategoryName &&
      classification.confidenceScore >= 0.7,
  );
}

function needsReviewPrediction({
  reason,
  systemName = NEEDS_REVIEW_SYSTEM,
}: {
  reason: string;
  systemName?: string;
}): ClassificationPrediction {
  return {
    classification_reason: reason,
    classification_source: systemName === NEEDS_REVIEW_SYSTEM ? "needs_review" : "rules",
    confidence_score: systemName === NEEDS_REVIEW_SYSTEM ? 0.18 : 0.48,
    needs_review: true,
    predicted_category: systemName,
    predicted_classification_subcategory: null,
    predicted_subcategory: NEEDS_REVIEW_CATEGORY,
    predicted_supplier_type: "Needs review",
  };
}

function manualClassificationPrediction(
  classification: PreservedManualClassification,
  fallbackReason: string,
): ClassificationPrediction {
  return {
    classification_reason: classification.classificationReason || fallbackReason,
    classification_source: "learned",
    confidence_score: classification.confidenceScore || 1,
    needs_review: false,
    predicted_category: classification.category,
    predicted_classification_subcategory: classification.classificationSubcategory,
    predicted_subcategory: classification.subcategory,
    predicted_supplier_type: "User corrected supplier",
  };
}

function resolveBoqItemClassification(
  row: ParsedBoqRow,
  context: {
    durableManualMemory: ReturnType<typeof buildPreservedManualClassificationMaps> | null;
    learnedClassifications: LearnedClassification[];
    preservedManualCorrections: ReturnType<typeof buildPreservedManualClassificationMaps> | null;
  },
): ClassificationPrediction {
  const durableManualClassification = context.durableManualMemory
    ? findPreservedManualClassification(row, context.durableManualMemory)
    : null;

  if (durableManualClassification) {
    return manualClassificationPrediction(durableManualClassification, "Restored from durable manual classification memory.");
  }

  const preservedManualClassification = context.preservedManualCorrections
    ? findPreservedManualClassification(row, context.preservedManualCorrections)
    : null;

  if (preservedManualClassification) {
    return manualClassificationPrediction(preservedManualClassification, "Preserved manual correction during reparse.");
  }

  const learnedClassification = findLearnedClassification(row.description, context.learnedClassifications);

  if (learnedClassification) {
    const learnedHasSubcategory = Boolean(learnedClassification.subcategoryName);

    return {
      classification_reason: learnedClassification.reason || "Matched previous manual correction memory.",
      classification_source: "learned",
      needs_review: !learnedHasSubcategory,
      predicted_category: learnedClassification.systemName,
      predicted_subcategory: learnedClassification.categoryName,
      predicted_classification_subcategory: learnedClassification.subcategoryName || null,
      predicted_supplier_type: learnedClassification.supplierType,
      confidence_score: learnedHasSubcategory ? learnedClassification.confidenceScore : Math.min(learnedClassification.confidenceScore, 0.68),
    };
  }

  const inheritedClassification = inferClassificationFromExcelContext(row.sheet_name, row.section_header);
  const inheritedSystemHint =
    inheritedClassification?.systemName && inheritedClassification.systemName !== NEEDS_REVIEW_SYSTEM
      ? inheritedClassification.systemName
      : undefined;
  const rulesClassification = classifyBoqSystem(row.description, inheritedSystemHint);
  const classification = isStrongClassification(rulesClassification)
    ? rulesClassification
    : isStrongClassification(inheritedClassification)
      ? inheritedClassification
      : null;

  if (!classification) {
    return needsReviewPrediction({
      reason: inheritedSystemHint
        ? "System inferred from Excel context, but category and subcategory require review."
        : "Local classifier could not confidently map this item.",
      systemName: inheritedSystemHint || rulesClassification.systemName,
    });
  }

  const needsReview = false;

  return {
    classification_reason:
      classification.reason ||
      (classification === rulesClassification ? "Matched local classification rules." : "Inherited from Excel context."),
    classification_source: classification.source || "rules",
    needs_review: needsReview,
    predicted_category: classification.systemName,
    predicted_subcategory: classification.categoryName,
    predicted_classification_subcategory: classification.subcategoryName || null,
    predicted_supplier_type: classification.supplierType,
    confidence_score: classification.confidenceScore,
  };
}

function predictClassification(
  row: ParsedBoqRow,
  learnedClassifications: LearnedClassification[] = [],
  preservedManualClassifications: ReturnType<typeof buildPreservedManualClassificationMaps> | null = null,
): ClassificationPrediction {
  return resolveBoqItemClassification(row, {
    durableManualMemory: preservedManualClassifications,
    learnedClassifications,
    preservedManualCorrections: null,
  });
}

function inheritedDisplayGroup(row: Pick<ParsedBoqRow, "inherited_category" | "inherited_subcategory" | "section_header">) {
  return row.inherited_category || row.inherited_subcategory || row.section_header || null;
}

function logBoqParserDebugSummary(projectId: string, rows: ParsedBoqRow[]) {
  const rowsBySheet = rows.reduce((summary, row) => {
    const sheetName = row.source_sheet_name || row.sheet_name || "Unknown";
    const current = summary.get(sheetName) || { headerRows: 0, ignoredRows: 0, inheritedRows: 0, itemRows: 0, needsReviewRows: 0, rows: 0 };
    const prediction = row.row_type === "item" ? predictClassification(row) : null;

    current.rows += 1;
    current.headerRows += row.row_type === "header" ? 1 : 0;
    current.ignoredRows += row.row_type && row.row_type !== "item" && row.row_type !== "header" ? 1 : 0;
    current.itemRows += row.row_type === "item" ? 1 : 0;
    current.inheritedRows += row.row_type === "item" && Boolean(row.section_header) ? 1 : 0;
    current.needsReviewRows += prediction?.classification_source === "needs_review" ? 1 : 0;
    summary.set(sheetName, current);

    return summary;
  }, new Map<string, { headerRows: number; ignoredRows: number; inheritedRows: number; itemRows: number; needsReviewRows: number; rows: number }>());
  const itemRows = rows.filter((row) => row.row_type === "item");
  const rowsSentToAi = itemRows.filter((row) => {
    const prediction = predictClassification(row);

    return prediction.classification_source === "needs_review" || prediction.confidence_score < 0.7;
  }).length;
  const totals = Array.from(rowsBySheet.values()).reduce(
    (summary, sheet) => ({
      headerRows: summary.headerRows + sheet.headerRows,
      ignoredRows: summary.ignoredRows + sheet.ignoredRows,
      inheritedRows: summary.inheritedRows + sheet.inheritedRows,
      itemRows: summary.itemRows + sheet.itemRows,
      needsReviewRows: summary.needsReviewRows + sheet.needsReviewRows,
      rows: summary.rows + sheet.rows,
    }),
    { headerRows: 0, ignoredRows: 0, inheritedRows: 0, itemRows: 0, needsReviewRows: 0, rows: 0 },
  );

  console.log(
    `BOQ parser summary ${JSON.stringify({
      projectId,
      sheets: Array.from(rowsBySheet.entries()).map(([sheetName, summary]) => ({ sheetName, ...summary })),
      sheetsParsed: rowsBySheet.size,
      totals: {
        ...totals,
        rowsSentToAi,
      },
    })}`,
  );
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
  const normalizedDescription = description.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
  let bestMatch: {
    categoryName: string;
    matchedTokens: number;
    score: number;
    subcategoryName: string | null;
    systemName: string;
  } | null = null;

  for (const learnedClassification of learnedClassifications) {
    const learnedDescription = learnedClassification.item_description;
    const systemName =
      learnedClassification.final_system ||
      learnedClassification.user_corrected_category ||
      learnedClassification.output?.system ||
      learnedClassification.final_category;
    const categoryName =
      learnedClassification.final_system
        ? learnedClassification.final_category || learnedClassification.user_corrected_subcategory || learnedClassification.output?.category
        : learnedClassification.user_corrected_subcategory || learnedClassification.output?.category || learnedClassification.final_subcategory;
    const subcategoryName =
      learnedClassification.final_classification_subcategory ||
      (learnedClassification.final_system ? learnedClassification.final_subcategory : null) ||
      learnedClassification.output?.subcategory ||
      null;

    if (!learnedDescription || !systemName || !categoryName || !isValidSystem(systemName) || !isValidCategory(systemName, categoryName)) {
      continue;
    }

    const validSubcategory = isValidSubcategory(systemName, categoryName, subcategoryName) ? subcategoryName : null;
    const learnedTokens = Array.from(descriptionTokens(learnedDescription));
    const normalizedLearnedDescription = learnedDescription
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
    const directHits = tokens.filter((token) => learnedTokens.includes(token)).length;
    const fuzzyHits = tokens.reduce((total, token) => {
      const bestTokenScore = learnedTokens.reduce((best, learnedToken) => Math.max(best, tokenSimilarity(token, learnedToken)), 0);

      return total + bestTokenScore;
    }, 0);
    const matchedTokens = Math.max(directHits, Math.floor(fuzzyHits));
    const coverage = tokens.length > 0 ? Math.max(directHits, fuzzyHits) / tokens.length : 0;
    const reverseCoverage = learnedTokens.length > 0 ? directHits / learnedTokens.length : 0;
    const unionSize = new Set([...tokens, ...learnedTokens]).size || 1;
    const jaccard = directHits / unionSize;
    const score = Math.max(coverage * 0.7 + reverseCoverage * 0.2 + jaccard * 0.1, reverseCoverage);

    if (
      normalizedDescription.length >= 8 &&
      normalizedLearnedDescription.length >= 8 &&
      (normalizedDescription.includes(normalizedLearnedDescription) || normalizedLearnedDescription.includes(normalizedDescription))
    ) {
      bestMatch = { categoryName, matchedTokens: tokens.length, score: 1, subcategoryName: validSubcategory, systemName };
      continue;
    }

    if (!bestMatch || score > bestMatch.score) {
      bestMatch = { categoryName, matchedTokens, score, subcategoryName: validSubcategory, systemName };
    }
  }

  if (!bestMatch || bestMatch.score < 0.58 || bestMatch.matchedTokens < Math.min(2, tokens.length)) {
    return null;
  }

  return {
    categoryName: bestMatch.categoryName,
    confidenceScore: Math.min(0.94, 0.76 + bestMatch.score * 0.18),
    reason: "Matched previous manual correction memory.",
    source: "learned" as const,
    subcategoryName: bestMatch.subcategoryName,
    supplierType: "Learned supplier",
    systemName: bestMatch.systemName,
  } satisfies SystemClassification;
}

async function getLearnedClassifications(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
) {
  const selectAttempts = [
    "item_description, normalized_description, final_system, final_category, final_subcategory, final_classification_subcategory, user_corrected_category, user_corrected_subcategory, quantity, unit, source_sheet_name, source_row_number, output",
    "item_description, final_system, final_category, final_subcategory, final_classification_subcategory, user_corrected_category, user_corrected_subcategory, output",
    "item_description, final_category, final_subcategory, final_classification_subcategory, user_corrected_category, user_corrected_subcategory, output",
    "item_description, final_category, final_subcategory, user_corrected_category, user_corrected_subcategory, output",
  ];

  for (const selectColumns of selectAttempts) {
    const { data, error } = await supabase
      .from("ai_training_data")
      .select(selectColumns)
      .eq("user_id", userId)
      .not("user_corrected_category", "is", null)
      .not("user_corrected_subcategory", "is", null)
      .not("item_description", "is", null)
      .order("created_at", { ascending: false })
      .limit(1000);

    if (!error) {
      return ((data || []) as unknown) as LearnedClassification[];
    }

    if (
      !error.message.includes("final_system") &&
      !error.message.includes("final_classification_subcategory") &&
      !error.message.includes("normalized_description") &&
      !error.message.includes("source_sheet_name") &&
      !error.message.includes("source_row_number") &&
      !error.message.includes("quantity") &&
      !error.message.includes("unit") &&
      !error.message.includes("schema cache")
    ) {
      console.error(`Failed reading learned classifications: ${error.message}`);
      return [];
    }
  }

  return [];
}

function isManualBoqClassification(row: BoqClassificationRow) {
  const reason = row.classification_reason?.toLowerCase() || "";
  const confidenceScore = Number(row.classification_confidence || 0);

  return Boolean(
    row.classification_source === "learned" ||
      (row.category &&
        row.subcategory &&
        row.classification_subcategory &&
        confidenceScore >= 1 &&
        (reason.includes("manual") || reason.includes("user"))),
  );
}

function manualClassificationMemoryPayload({
  category,
  classificationSubcategory,
  confidenceScore = 1,
  description,
  projectId,
  quantity,
  reason,
  rowId,
  rowNumber,
  sheetName,
  sourceFileId,
  subcategory,
  unit,
  userId,
}: {
  category: string;
  classificationSubcategory: string | null;
  confidenceScore?: number;
  description: string;
  projectId: string;
  quantity?: number | null;
  reason?: string | null;
  rowId?: string | null;
  rowNumber?: number | null;
  sheetName?: string | null;
  sourceFileId?: string | null;
  subcategory: string;
  unit?: string | null;
  userId: string;
}) {
  const normalizedDescription = normalizeFingerprintText(description);
  const strictFingerprint = boqRowStrictFingerprint({
    description,
    quantity,
    rowNumber,
    sheetName,
    unit,
  });

  return {
    confidence_score: confidenceScore,
    feedback: reason || "Manual classification memory",
    final_category: subcategory,
    final_classification_subcategory: classificationSubcategory,
    final_subcategory: classificationSubcategory,
    final_system: category,
    input: {
      description,
      normalized_description: normalizedDescription,
      quantity,
      row_number: rowNumber,
      sheet_name: sheetName,
      strict_fingerprint: strictFingerprint,
      unit,
    },
    item_description: description,
    item_fingerprint: strictFingerprint,
    normalized_description: normalizedDescription,
    output: {
      category: subcategory,
      subcategory: classificationSubcategory,
      system: category,
    },
    project_id: projectId,
    quantity,
    source_file_id: sourceFileId || null,
    source_id: rowId || null,
    source_row_number: rowNumber,
    source_sheet_name: sheetName,
    source_type: "manual_classification_memory",
    unit,
    updated_at: new Date().toISOString(),
    user_corrected_category: category,
    user_corrected_subcategory: subcategory,
    user_id: userId,
  };
}

async function persistManualClassificationMemory({
  records,
  supabase,
}: {
  records: Array<ReturnType<typeof manualClassificationMemoryPayload>>;
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
}) {
  if (records.length === 0) {
    return;
  }

  const fullResult = await supabase.from("ai_training_data").insert(records);

  if (!fullResult.error) {
    return;
  }

  const canFallback =
    fullResult.error.message.includes("schema cache") ||
    fullResult.error.message.includes("final_system") ||
    fullResult.error.message.includes("final_classification_subcategory") ||
    fullResult.error.message.includes("normalized_description") ||
    fullResult.error.message.includes("item_fingerprint") ||
    fullResult.error.message.includes("source_sheet_name") ||
    fullResult.error.message.includes("source_row_number") ||
    fullResult.error.message.includes("quantity") ||
    fullResult.error.message.includes("unit") ||
    fullResult.error.message.includes("updated_at");

  if (!canFallback) {
    console.error(`Failed saving manual classification memory: ${fullResult.error.message}`);
    return;
  }

  const legacyRecords = records.map((record) => ({
    confidence_score: record.confidence_score,
    feedback: record.feedback,
    final_category: record.final_system,
    final_subcategory: record.final_category,
    input: record.input,
    item_description: record.item_description,
    output: record.output,
    predicted_category: record.final_system,
    predicted_subcategory: record.final_category,
    project_id: record.project_id,
    source_file_id: record.source_file_id,
    source_id: record.source_id,
    source_type: record.source_type,
    user_corrected_category: record.final_system,
    user_corrected_subcategory: record.final_category,
    user_id: record.user_id,
  }));
  const legacyResult = await supabase.from("ai_training_data").insert(legacyRecords);

  if (legacyResult.error) {
    console.error(`Failed saving legacy manual classification memory: ${legacyResult.error.message}`);
  }
}

async function getPreservedManualClassificationsForProject({
  projectId,
  supabase,
  userId,
}: {
  projectId: string;
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  userId: string;
}): Promise<ManualClassificationRestoreSet> {
  const selectAttempts = [
    "id, description, quantity, unit, category, subcategory, classification_subcategory, classification_confidence, classification_reason, classification_source, needs_review, row_type, sheet_name, row_number, source_sheet_name, source_row_number",
    "id, description, quantity, unit, category, subcategory, classification_subcategory, classification_confidence, classification_reason, classification_source, row_type, sheet_name, row_number",
    "id, description, quantity, unit, category, subcategory, classification_subcategory, classification_reason, classification_source, sheet_name, row_number",
    "id, description, quantity, unit, category, subcategory, classification_subcategory, classification_source",
  ];
  let rows: unknown[] = [];

  for (const selectColumns of selectAttempts) {
    const result = await supabase
      .from("boq_items")
      .select(selectColumns)
      .eq("project_id", projectId)
      .eq("user_id", userId);

    if (!result.error) {
      rows = result.data || [];
      break;
    }

    if (
      !result.error.message.includes("schema cache") &&
      !result.error.message.includes("classification_subcategory") &&
      !result.error.message.includes("classification_confidence") &&
      !result.error.message.includes("classification_reason") &&
      !result.error.message.includes("classification_source") &&
      !result.error.message.includes("source_sheet_name") &&
      !result.error.message.includes("source_row_number") &&
      !result.error.message.includes("row_type")
    ) {
      console.error(`Failed reading manual BOQ classifications before reparse: ${result.error.message}`);
      break;
    }
  }

  const currentManualClassifications = ((rows || []) as BoqClassificationRow[])
    .filter((row) => (!row.row_type || row.row_type === "item") && isManualBoqClassification(row))
    .map((row) => ({
      category: row.category || NEEDS_REVIEW_SYSTEM,
      classificationReason: row.classification_reason || "Preserved manual correction during reparse.",
      classificationSubcategory: row.classification_subcategory || null,
      confidenceScore: Number(row.classification_confidence || 1),
      description: row.description,
      quantity: row.quantity === null || row.quantity === undefined ? null : Number(row.quantity || 0),
      rowNumber:
        row.source_row_number === null || row.source_row_number === undefined
          ? row.row_number === null || row.row_number === undefined
            ? null
            : Number(row.row_number)
          : Number(row.source_row_number),
      sheetName: row.source_sheet_name || row.sheet_name || null,
      subcategory: row.subcategory || NEEDS_REVIEW_CATEGORY,
      unit: row.unit || null,
    })) satisfies PreservedManualClassification[];

  await persistManualClassificationMemory({
    records: currentManualClassifications.map((classification) =>
      manualClassificationMemoryPayload({
        category: classification.category,
        classificationSubcategory: classification.classificationSubcategory,
        confidenceScore: classification.confidenceScore,
        description: classification.description,
        projectId,
        quantity: classification.quantity,
        reason: classification.classificationReason || "Backfilled manual correction before reparse.",
        rowNumber: classification.rowNumber,
        sheetName: classification.sheetName,
        subcategory: classification.subcategory,
        unit: classification.unit,
        userId,
      }),
    ),
    supabase,
  });

  const memorySelectAttempts = [
    "item_description, normalized_description, item_fingerprint, source_sheet_name, source_row_number, quantity, unit, final_system, final_category, final_subcategory, final_classification_subcategory, user_corrected_category, user_corrected_subcategory, output, confidence_score, feedback",
    "item_description, final_category, final_subcategory, final_classification_subcategory, user_corrected_category, user_corrected_subcategory, output, confidence_score, feedback",
    "item_description, final_category, final_subcategory, user_corrected_category, user_corrected_subcategory, output, confidence_score, feedback",
  ];
  let memoryRows: unknown[] = [];

  for (const selectColumns of memorySelectAttempts) {
    const result = await supabase
      .from("ai_training_data")
      .select(selectColumns)
      .eq("project_id", projectId)
      .eq("user_id", userId)
      .not("item_description", "is", null)
      .not("user_corrected_category", "is", null)
      .order("created_at", { ascending: false })
      .limit(2000);

    if (!result.error) {
      memoryRows = result.data || [];
      break;
    }

    if (
      !result.error.message.includes("schema cache") &&
      !result.error.message.includes("final_system") &&
      !result.error.message.includes("final_classification_subcategory") &&
      !result.error.message.includes("normalized_description") &&
      !result.error.message.includes("item_fingerprint") &&
      !result.error.message.includes("source_sheet_name") &&
      !result.error.message.includes("source_row_number") &&
      !result.error.message.includes("quantity") &&
      !result.error.message.includes("unit")
    ) {
      console.error(`Failed reading durable manual classification memory: ${result.error.message}`);
      break;
    }
  }

  const durableManualClassifications = ((memoryRows || []) as LearnedClassification[])
    .map((row): PreservedManualClassification | null => {
      const systemName = row.final_system || row.user_corrected_category || row.output?.system || row.final_category;
      const categoryName = row.final_system
        ? row.final_category || row.user_corrected_subcategory || row.output?.category
        : row.user_corrected_subcategory || row.output?.category || row.final_subcategory;
      const subcategoryName =
        row.final_classification_subcategory || (row.final_system ? row.final_subcategory : null) || row.output?.subcategory || null;

      if (!row.item_description || !systemName || !categoryName || !subcategoryName) {
        return null;
      }

      return {
        category: systemName,
        classificationReason: "Restored from durable manual classification memory.",
        classificationSubcategory: subcategoryName,
        confidenceScore: 1,
        description: row.item_description,
        quantity: row.quantity === null || row.quantity === undefined ? null : Number(row.quantity || 0),
        rowNumber: row.source_row_number === null || row.source_row_number === undefined ? null : Number(row.source_row_number),
        sheetName: row.source_sheet_name || null,
        subcategory: categoryName,
        unit: row.unit || null,
      } satisfies PreservedManualClassification;
    })
    .filter((classification): classification is PreservedManualClassification => classification !== null);

  return { currentManualClassifications, durableManualClassifications };
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
  manualClassificationRestoreSet = {
    currentManualClassifications: [],
    durableManualClassifications: [],
  },
  projectFileId,
  projectId,
  rows,
  supabase,
  userId,
}: {
  manualClassificationRestoreSet?: ManualClassificationRestoreSet;
  projectFileId: string;
  projectId: string;
  rows: ParsedBoqRow[];
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  userId: string;
}) {
  const normalizedRows = normalizeParsedBoqRowsShared(rows);
  const parserSummary = getBoqParserSummary(normalizedRows);
  const learnedClassifications = await getLearnedClassifications(supabase, userId);
  const durableManualMemoryMaps = buildPreservedManualClassificationMaps(manualClassificationRestoreSet.durableManualClassifications);
  const preservedManualCorrectionMaps = buildPreservedManualClassificationMaps(manualClassificationRestoreSet.currentManualClassifications);
  const classificationContext = {
    durableManualMemory: durableManualMemoryMaps,
    learnedClassifications,
    preservedManualCorrections: preservedManualCorrectionMaps,
  };
  logBoqParserDebugSummary(projectId, normalizedRows);
  const buildBoqRows = ({ fileColumns, optionalColumns }: BoqInsertMode) => {
    const includesContextColumns =
      optionalColumns === "full" ||
      optionalColumns === "withoutConfidence" ||
      optionalColumns === "withoutClassificationStatus" ||
      optionalColumns === "withoutClassificationMeta" ||
      optionalColumns === "contextOnly";
    const includesClassificationMeta =
      optionalColumns === "full" || optionalColumns === "withoutConfidence" || optionalColumns === "withoutClassificationStatus";
    const includesNeedsReview = includesClassificationMeta || optionalColumns === "withoutClassificationMeta";
    const rowsForInsert =
      includesContextColumns
        ? normalizedRows
        : normalizedRows.filter((row) => row.row_type === "item");

    return rowsForInsert.map((row) => {
      const rowType = row.row_type || "item";
      const prediction =
        rowType === "item"
          ? resolveBoqItemClassification(row, classificationContext)
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

      if (optionalColumns !== "legacy") {
        payload.rate = row.rate;
        payload.amount = row.amount;
        payload.category = prediction.predicted_category;
        payload.subcategory =
          optionalColumns === "basicClassification"
            ? inheritedDisplayGroup(row) || prediction.predicted_subcategory
            : prediction.predicted_subcategory;
        payload.confidence_score = prediction.confidence_score;
      }

      if (includesClassificationMeta) {
        payload.classification_subcategory = prediction.predicted_classification_subcategory;
        payload.classification_confidence = prediction.confidence_score;
        payload.classification_reason = prediction.classification_reason;
        payload.classification_source = prediction.classification_source;
        if (optionalColumns !== "withoutClassificationStatus") {
          payload.classification_status = prediction.needs_review ? "needs_review" : "classified";
        }
      }

      if (includesContextColumns) {
        payload.cleanup_reason = row.cleanup_reason;
        payload.inherited_category = row.inherited_category;
        payload.inherited_subcategory = row.inherited_subcategory;
        payload.row_type = rowType;
        payload.section_header = row.section_header;
        payload.source_row_number = row.source_row_number || row.row_number;
        payload.source_sheet_name = row.source_sheet_name || row.sheet_name;
      }

      if (includesNeedsReview) {
        payload.needs_review = prediction.needs_review;
      }

      if (optionalColumns === "withoutConfidence") {
        delete payload.classification_confidence;
      }

      if (fileColumns === "both" || fileColumns === "project_file_id") {
        payload.project_file_id = projectFileId;
      }

      if (fileColumns === "both" || fileColumns === "source_file_id") {
        payload.source_file_id = projectFileId;
      }

      return payload;
    });
  };

  const insertAttempts: BoqInsertMode[] = [
    { fileColumns: "both", optionalColumns: "full" },
    { fileColumns: "both", optionalColumns: "withoutConfidence" },
    { fileColumns: "both", optionalColumns: "withoutClassificationStatus" },
    { fileColumns: "both", optionalColumns: "withoutClassificationMeta" },
    { fileColumns: "both", optionalColumns: "contextOnly" },
    { fileColumns: "both", optionalColumns: "basicClassification" },
    { fileColumns: "both", optionalColumns: "legacy" },
    { fileColumns: "source_file_id", optionalColumns: "full" },
    { fileColumns: "source_file_id", optionalColumns: "withoutConfidence" },
    { fileColumns: "source_file_id", optionalColumns: "withoutClassificationStatus" },
    { fileColumns: "source_file_id", optionalColumns: "withoutClassificationMeta" },
    { fileColumns: "source_file_id", optionalColumns: "contextOnly" },
    { fileColumns: "source_file_id", optionalColumns: "basicClassification" },
    { fileColumns: "source_file_id", optionalColumns: "legacy" },
    { fileColumns: "project_file_id", optionalColumns: "full" },
    { fileColumns: "project_file_id", optionalColumns: "withoutConfidence" },
    { fileColumns: "project_file_id", optionalColumns: "withoutClassificationStatus" },
    { fileColumns: "project_file_id", optionalColumns: "withoutClassificationMeta" },
    { fileColumns: "project_file_id", optionalColumns: "contextOnly" },
    { fileColumns: "project_file_id", optionalColumns: "basicClassification" },
    { fileColumns: "project_file_id", optionalColumns: "legacy" },
  ];
  let boqInsertError: string | null = null;
  let insertedWithFileColumns: BoqInsertMode["fileColumns"] | null = null;
  let insertedWithOptionalColumns: BoqInsertMode["optionalColumns"] | null = null;

  console.info(
    `[boq-parse] preparing insert project=${projectId} file=${projectFileId} rows=${normalizedRows.length} items=${parserSummary.itemRows}`,
  );

  for (const insertMode of insertAttempts) {
    const { error: boqError } = await supabase.from("boq_items").insert(buildBoqRows(insertMode));

    if (!boqError) {
      boqInsertError = null;
      insertedWithFileColumns = insertMode.fileColumns;
      insertedWithOptionalColumns = insertMode.optionalColumns;
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
      boqError.message.includes("classification_confidence") ||
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
    return { error: boqInsertError, parserSummary };
  }

  const verification = await verifyParsedBoqPersistence({
    projectFileId,
    projectId,
    supabase,
    userId,
  });

  if (verification.error) {
    return { error: verification.error, parserSummary };
  }

  parserSummary.persisted = {
    inheritedRows: verification.inheritedRows ?? 0,
    itemRows: verification.itemRows ?? 0,
    totalRows: verification.totalRows ?? 0,
  };

  console.info(
    `[boq-parse] inserted project=${projectId} file=${projectFileId} fileColumns=${insertedWithFileColumns} optionalColumns=${insertedWithOptionalColumns} rows=${verification.totalRows} items=${verification.itemRows} inherited=${verification.inheritedRows}`,
  );

  if (verification.totalRows === 0) {
    return {
      error:
        "BOQ parsed but no rows were persisted for this file. Check production boq_items source_file_id/project_file_id schema and RLS policies.",
      parserSummary,
    };
  }

  const itemRows = normalizedRows.filter((row) => row.row_type === "item");

  if (itemRows.length === 0) {
    return { error: null, parserSummary };
  }

  const { error: learningError } = await supabase.from("ai_training_data").insert(
    itemRows.map((row) => {
      const prediction = resolveBoqItemClassification(row, classificationContext);

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

  return { error: null, parserSummary };
}

async function countParsedRowsForFile({
  projectFileId,
  projectId,
  rowType,
  supabase,
  userId,
  withInheritedSection,
}: {
  projectFileId: string;
  projectId: string;
  rowType?: BoqRowType;
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  userId: string;
  withInheritedSection?: boolean;
}) {
  const attempts = [
    () =>
      supabase
        .from("boq_items")
        .select("id", { count: "exact", head: true })
        .eq("project_id", projectId)
        .eq("user_id", userId)
        .or(`source_file_id.eq.${projectFileId},project_file_id.eq.${projectFileId}`),
    () =>
      supabase
        .from("boq_items")
        .select("id", { count: "exact", head: true })
        .eq("project_id", projectId)
        .eq("user_id", userId)
        .eq("project_file_id", projectFileId),
    () =>
      supabase
        .from("boq_items")
        .select("id", { count: "exact", head: true })
        .eq("project_id", projectId)
        .eq("user_id", userId)
        .eq("source_file_id", projectFileId),
  ];

  let lastError: string | null = null;

  for (const buildQuery of attempts) {
    let query = buildQuery();

    if (rowType) {
      query = query.eq("row_type", rowType);
    }

    if (withInheritedSection) {
      query = query.not("section_header", "is", null);
    }

    const { count, error } = await query;

    if (!error) {
      return { count: count || 0, error: null };
    }

    lastError = error.message;
  }

  return { count: 0, error: lastError || "Could not verify parsed BOQ rows." };
}

async function verifyParsedBoqPersistence({
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
  const totalRows = await countParsedRowsForFile({ projectFileId, projectId, supabase, userId });

  if (totalRows.error) {
    console.error(`[boq-parse] failed verifying persisted rows: ${totalRows.error}`);
    return { error: `BOQ rows were inserted but verification failed: ${totalRows.error}` };
  }

  const itemRows = await countParsedRowsForFile({ projectFileId, projectId, rowType: "item", supabase, userId });
  const inheritedRows = await countParsedRowsForFile({
    projectFileId,
    projectId,
    rowType: "item",
    supabase,
    userId,
    withInheritedSection: true,
  });

  return {
    error: null,
    inheritedRows: inheritedRows.error ? 0 : inheritedRows.count,
    itemRows: itemRows.error ? totalRows.count : itemRows.count,
    totalRows: totalRows.count,
  };
}

async function markProjectFileParsed({
  parserSummary,
  projectFileId,
  projectId,
  supabase,
  userId,
}: {
  parserSummary?: BoqParserSummary;
  projectFileId: string;
  projectId: string;
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  userId: string;
}) {
  const { error } = await supabase
    .from("project_files")
    .update({
      parse_status: "parsed",
      parsed_at: new Date().toISOString(),
      parsed_rows: parserSummary?.persisted?.totalRows ?? parserSummary?.totalParsedRows ?? null,
    })
    .eq("id", projectFileId)
    .eq("project_id", projectId)
    .eq("user_id", userId);

  if (error) {
    console.info(`[boq-parse] skipped project_files parse status update: ${error.message}`);
  }
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
  let deletedLinkedRows = false;

  for (const deleteAttempt of deleteAttempts) {
    const { error } = await deleteAttempt();

    if (!error) {
      deletedLinkedRows = true;
      break;
    }

    console.error(`Failed deleting existing parsed BOQ rows before parse: ${error.message}`);
  }

  if (!deletedLinkedRows) {
    console.error(`Failed deleting linked BOQ rows before parse for file=${projectFileId}`);
  }

  const { error: staleUnlinkedError } = await supabase
    .from("boq_items")
    .delete()
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .is("source_file_id", null)
    .is("project_file_id", null);

  if (staleUnlinkedError) {
    console.info(`[boq-parse] skipped stale unlinked BOQ cleanup: ${staleUnlinkedError.message}`);
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
    let parserSummary: BoqParserSummary | undefined;
    const savedMapping = await getProjectColumnMapping(supabase, projectId, user.id);

    try {
      rows = await parseBoqWorkbookShared(file, savedMapping);
    } catch (error) {
      if (error instanceof SharedMappingRequiredError) {
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
      const saveResult = await saveParsedBoqRows({
        projectFileId: projectFile.id,
        projectId,
        rows,
        supabase,
        userId: user.id,
      });

      parserSummary = saveResult.parserSummary;

      if (saveResult.error) {
        return { ok: false, error: saveResult.error, parserSummary } satisfies ProjectDocumentActionResult;
      }

      await markProjectFileParsed({
        parserSummary,
        projectFileId: projectFile.id,
        projectId,
        supabase,
        userId: user.id,
      });
    }

    revalidatePath(`/projects/${projectId}`);
    return {
      ok: true,
      message: "File uploaded and BOQ parsed successfully.",
      parserSummary,
      projectFileId: projectFile.id,
    } satisfies ProjectDocumentActionResult;
  }

  revalidatePath(`/projects/${projectId}`);
  return { ok: true, message: "File uploaded successfully.", projectFileId: projectFile.id } satisfies ProjectDocumentActionResult;
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
    rows = await parseBoqWorkbookShared(blob, mapping);
  } catch (error) {
    return actionError(error, "Excel parsing failed with the selected mapping.");
  }

  const manualClassificationRestoreSet = await getPreservedManualClassificationsForProject({
    projectId,
    supabase,
    userId: user.id,
  });

  await deleteParsedBoqRowsForFile({
    projectFileId,
    projectId,
    supabase,
    userId: user.id,
  });

  const saveResult = await saveParsedBoqRows({
    manualClassificationRestoreSet,
    projectFileId,
    projectId,
    rows,
    supabase,
    userId: user.id,
  });

  if (saveResult.error) {
    return { ok: false, error: saveResult.error, parserSummary: saveResult.parserSummary } satisfies ProjectDocumentActionResult;
  }

  await markProjectFileParsed({
    parserSummary: saveResult.parserSummary,
    projectFileId,
    projectId,
    supabase,
    userId: user.id,
  });

  revalidatePath(`/projects/${projectId}`);
  return {
    ok: true,
    message: "Column mapping saved and BOQ parsed.",
    parserSummary: saveResult.parserSummary,
    projectFileId,
  } satisfies ProjectDocumentActionResult;
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
    rows = await parseBoqWorkbookShared(blob, savedMapping);
  } catch (error) {
    if (error instanceof SharedMappingRequiredError) {
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

  const manualClassificationRestoreSet = await getPreservedManualClassificationsForProject({
    projectId,
    supabase,
    userId: user.id,
  });

  await deleteParsedBoqRowsForFile({
    projectFileId,
    projectId,
    supabase,
    userId: user.id,
  });

  const saveResult = await saveParsedBoqRows({
    manualClassificationRestoreSet,
    projectFileId,
    projectId,
    rows,
    supabase,
    userId: user.id,
  });

  if (saveResult.error) {
    return { ok: false, error: saveResult.error, parserSummary: saveResult.parserSummary } satisfies ProjectDocumentActionResult;
  }

  await markProjectFileParsed({
    parserSummary: saveResult.parserSummary,
    projectFileId,
    projectId,
    supabase,
    userId: user.id,
  });

  revalidatePath(`/projects/${projectId}`);
  return {
    ok: true,
    message: "BOQ parsed successfully.",
    parserSummary: saveResult.parserSummary,
    projectFileId,
  } satisfies ProjectDocumentActionResult;
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
  requireManualPersistence = false,
  row,
  supabase,
  systemId,
  needsReviewOverride,
}: {
  categoryId?: string;
  classification: SystemClassification;
  needsReviewOverride?: boolean;
  requireManualPersistence?: boolean;
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
    (classification.systemName === NEEDS_REVIEW_SYSTEM ||
      classification.categoryName === NEEDS_REVIEW_CATEGORY ||
      !classification.subcategoryName ||
      classification.confidenceScore < 0.7 ||
      classificationSource === "needs_review");
  const basePayload = {
    category: classification.systemName,
    classification_subcategory: classification.subcategoryName || null,
    confidence_score: classification.confidenceScore,
    subcategory: classification.categoryName,
  };
  const legacyBasePayload = {
    category: classification.systemName,
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
      needs_review: needsReview,
      takeoff_quantity: takeoffQuantity,
      takeoff_unit: takeoffUnit,
    },
    {
      ...basePayload,
      classification_reason: classification.reason || null,
      classification_source: classificationSource,
      needs_review: needsReview,
    },
    {
      ...legacyBasePayload,
      classification_confidence: classification.confidenceScore,
      classification_reason: classification.reason || null,
      classification_source: classificationSource,
      classification_status: needsReview ? "needs_review" : "classified",
      needs_review: needsReview,
      takeoff_quantity: takeoffQuantity,
      takeoff_unit: takeoffUnit,
      updated_at: new Date().toISOString(),
    },
    legacyBasePayload,
    basePayload,
    {
      category: classification.systemName,
      subcategory: classification.categoryName,
    },
  ].filter(
    (payload) =>
      !requireManualPersistence ||
      ("classification_subcategory" in payload && "classification_source" in payload && "classification_reason" in payload),
  );
  let lastError: string | null = null;

  for (const payload of updateAttempts) {
    const { error } = await supabase.from("boq_items").update(payload).eq("id", row.id);

    if (!error) {
      if (requireManualPersistence) {
        const { data: verificationRow, error: verificationError } = await supabase
          .from("boq_items")
          .select("category, subcategory, classification_subcategory, classification_source")
          .eq("id", row.id)
          .maybeSingle();

        if (verificationError) {
          return verificationError.message;
        }

        const savedClassification = verificationRow as
          | {
              category?: string | null;
              classification_source?: string | null;
              classification_subcategory?: string | null;
              subcategory?: string | null;
            }
          | null;

        if (
          savedClassification?.category !== classification.systemName ||
          savedClassification?.subcategory !== classification.categoryName ||
          savedClassification?.classification_subcategory !== classification.subcategoryName ||
          savedClassification?.classification_source !== "learned"
        ) {
          return "Manual classification was not fully persisted. Check boq_items category, subcategory, classification_subcategory, and classification_source in Supabase.";
        }
      }

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
    const persistedSource = isClassificationSource(row.classification_source) ? row.classification_source : null;

    if (persistedSource === "learned" && row.category && row.subcategory && !row.needs_review) {
      return {
        classification: {
          categoryName: row.subcategory,
          confidenceScore: Number(row.classification_confidence || 1),
          reason: row.classification_reason || "User confirmed this classification.",
          source: "learned",
          subcategoryName: row.classification_subcategory || null,
          supplierType: classifyBoqSystem(row.description, row.category, row.subcategory, row.classification_subcategory).supplierType,
          systemName: row.category,
        } satisfies SystemClassification,
        source: "learned",
      };
    }

    const learnedClassification = findLearnedClassification(row.description, learnedClassifications);

    if (learnedClassification) {
      return {
        classification: learnedClassification,
        source: "learned",
      };
    }

    if (
      (persistedSource === "ai" || persistedSource === "inherited_header") &&
      row.category &&
      row.subcategory &&
      !row.needs_review &&
      Number(row.classification_confidence || 0) >= 0.7
    ) {
      return {
        classification: {
          categoryName: row.subcategory,
          confidenceScore: Number(row.classification_confidence || 0.8),
          reason: row.classification_reason || "Previously classified by AI.",
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
  const inheritedHeaderCount = classificationSources.filter((entry) => entry.source === "inherited_header").length;
  const needsReviewCount = classificationSources.filter((entry) => entry.source === "needs_review").length;

  if (isAiClassificationConfigured()) {
    const allAiCandidates = rows
      .map((row, index) => ({ classification: classifications[index], index, row, source: classificationSources[index].source }))
      .filter(
        (candidate) =>
          candidate.source !== "learned" &&
          candidate.source !== "ai" &&
          (candidate.classification.systemName === NEEDS_REVIEW_SYSTEM ||
            candidate.classification.confidenceScore < 0.7 ||
            candidate.source === "inherited_header"),
      );
    const aiCandidates = allAiCandidates.slice(0, MAX_AI_CLASSIFICATION_ITEMS_PER_RUN);
    const skippedAiCandidateCount = allAiCandidates.length - aiCandidates.length;

    console.log(
      `BOQ classification summary ${JSON.stringify({
        aiCandidateRows: aiCandidates.length,
        aiDeferredRows: skippedAiCandidateCount,
        aiBatches: Math.ceil(aiCandidates.length / AI_CLASSIFICATION_BATCH_SIZE),
        inheritedHeaderRows: inheritedHeaderCount,
        itemRows: rows.length,
        needsReviewRows: needsReviewCount,
      })}`,
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
          sectionHeader: candidate.row.section_header,
          sheetName: candidate.row.source_sheet_name,
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
        const aiReturnedClassification = aiClassification.source === "ai";
        const aiIsUseful =
          aiReturnedClassification &&
          currentClassification.source !== "learned" &&
          (currentClassification.confidenceScore < 0.7 ||
            currentClassification.systemName === NEEDS_REVIEW_SYSTEM ||
            (currentClassification.source === "inherited_header" &&
              aiClassification.systemName === currentClassification.systemName &&
              aiClassification.confidenceScore >= 0.75));

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
    console.log(
      `BOQ classification summary ${JSON.stringify({
        aiCandidateRows: 0,
        aiDeferredRows: 0,
        aiSkippedReason: "OPENAI_API_KEY is not configured",
        inheritedHeaderRows: inheritedHeaderCount,
        itemRows: rows.length,
        needsReviewRows: needsReviewCount,
      })}`,
    );
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
    const subcategoryName = readString(formData, "subcategory_name") || null;
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
      .select(
        "id, description, quantity, unit, amount, category, subcategory, classification_subcategory, source_file_id, project_file_id, source_sheet_name, source_row_number, sheet_name, row_number",
      )
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
      requireManualPersistence: true,
      row: row as BoqClassificationRow,
      supabase,
      systemId,
    });

    if (updateError) {
      return { ok: false, error: updateError } satisfies ProjectDocumentActionResult;
    }

    await persistManualClassificationMemory({
      records: [
        manualClassificationMemoryPayload({
          category: systemName,
          classificationSubcategory: subcategoryName,
          confidenceScore: previousClassification.confidenceScore,
          description: (row as BoqClassificationRow).description,
          projectId,
          quantity: (row as BoqClassificationRow).quantity,
          reason: "User system classification correction",
          rowId: itemId,
          rowNumber: (row as BoqClassificationRow).source_row_number || (row as BoqClassificationRow).row_number || null,
          sheetName: (row as BoqClassificationRow).source_sheet_name || (row as BoqClassificationRow).sheet_name || null,
          sourceFileId: (row as BoqClassificationRow).source_file_id || (row as BoqClassificationRow).project_file_id || null,
          subcategory: categoryName,
          unit: (row as BoqClassificationRow).unit,
          userId: user.id,
        }),
      ],
      supabase,
    });

    revalidatePath(`/projects/${projectId}`);
    revalidatePath(`/projects/${projectId}/intelligence`);
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
  const subcategoryName = readString(formData, "subcategory_name") || null;
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
    const rowSelects = [
      "id, description, quantity, unit, amount, category, subcategory, classification_subcategory, source_file_id, project_file_id, source_sheet_name, source_row_number, sheet_name, row_number, row_type",
      "id, description, quantity, unit, amount, category, subcategory, source_file_id, project_file_id, source_sheet_name, source_row_number, sheet_name, row_number, row_type",
      "id, description, quantity, unit, amount, category, subcategory, classification_subcategory, source_file_id, project_file_id, row_type",
      "id, description, quantity, unit, amount, category, subcategory, source_file_id, project_file_id, row_type",
      "id, description, quantity, unit, amount, category, subcategory, source_file_id, row_type",
      "id, description, quantity, unit, amount, category, subcategory, row_type",
      "id, description, quantity, unit, amount, category, subcategory",
    ];
    let rows: unknown[] | null = null;
    let rowsError: { message: string } | null = null;

    for (const selectColumns of rowSelects) {
      const result = await supabase
        .from("boq_items")
        .select(selectColumns)
        .eq("project_id", projectId)
        .eq("user_id", user.id)
        .in("id", itemIds);

      if (!result.error) {
        rows = result.data as unknown[] | null;
        rowsError = null;
        break;
      }

      rowsError = result.error;
      const canRetrySchemaFallback =
        result.error.message.includes("schema cache") ||
        result.error.message.includes("classification_subcategory") ||
        result.error.message.includes("project_file_id") ||
        result.error.message.includes("source_file_id") ||
        result.error.message.includes("source_sheet_name") ||
        result.error.message.includes("source_row_number") ||
        result.error.message.includes("row_type");

      if (!canRetrySchemaFallback) {
        break;
      }
    }

    if (rowsError) {
      return { ok: false, error: rowsError.message } satisfies ProjectDocumentActionResult;
    }

    const itemRows = ((rows || []) as BoqClassificationRow[]).filter((row) => !row.row_type || row.row_type === "item");

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
            requireManualPersistence: true,
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

      return manualClassificationMemoryPayload({
        category: change?.systemName || NEEDS_REVIEW_SYSTEM,
        classificationSubcategory: change?.subcategoryName || null,
        confidenceScore: previousClassification.confidenceScore,
        description: row.description,
        projectId,
        quantity: row.quantity,
        reason: "Manual bulk correction",
        rowId: row.id,
        rowNumber: row.source_row_number || row.row_number || null,
        sheetName: row.source_sheet_name || row.sheet_name || null,
        sourceFileId: row.source_file_id || row.project_file_id || null,
        subcategory: change?.categoryName || NEEDS_REVIEW_CATEGORY,
        unit: row.unit,
        userId: user.id,
      });
    });
    await persistManualClassificationMemory({ records: learningRows, supabase });

    revalidatePath(`/projects/${projectId}`);
    revalidatePath(`/projects/${projectId}/intelligence`);
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
