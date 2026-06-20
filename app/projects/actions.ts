"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as XLSX from "xlsx";
import { classifyBoqSystem, normalizeTakeoffUnit } from "@/lib/classification";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { DocumentType } from "@/lib/data";

const documentTypes = ["BOQ Excel", "Specification PDF", "Drawing PDF", "Other"] satisfies DocumentType[];
const allowedExtensions = [".xlsx", ".xls", ".pdf"];
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
  sheet_name: string;
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

type ClassificationPrediction = {
  predicted_category: string;
  predicted_subcategory: string;
  predicted_supplier_type: string;
  confidence_score: number;
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
};

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

function predictClassification(description: string): ClassificationPrediction {
  const classification = classifyBoqSystem(description);

  return {
    predicted_category: classification.systemName,
    predicted_subcategory: classification.categoryName,
    predicted_supplier_type: classification.supplierType,
    confidence_score: classification.confidenceScore,
  };
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
    return XLSX.read(buffer, { cellDates: true, dense: false, type: "array" });
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

      for (const [index, row] of rows.slice(inferred.rowStartIndex).entries()) {
        const description = cellText(row[inferred.descriptionColumn]);
        const quantity = inferred.quantityColumn >= 0 ? parseNumber(row[inferred.quantityColumn]) : null;
        const unit = inferred.unitColumn >= 0 ? cellText(row[inferred.unitColumn]) || null : null;
        const rate = inferred.rateColumn >= 0 ? parseNumber(row[inferred.rateColumn]) : null;
        const amount = inferred.amountColumn >= 0 ? parseNumber(row[inferred.amountColumn]) : null;

        if (!description) {
          continue;
        }

        parsedRows.push({
          amount,
          description,
          quantity,
          rate,
          row_number: inferred.rowStartIndex + index + 1,
          sheet_name: sheetName,
          unit,
        });
      }

      bestScore = Math.max(bestScore, 4);
      continue;
    }

    for (const [index, row] of rows.slice(headerRowIndex + 1).entries()) {
      const description = cellText(row[headerMatch.descriptionColumn]);
      const quantity = headerMatch.quantityColumn >= 0 ? parseNumber(row[headerMatch.quantityColumn]) : null;
      const unit = headerMatch.unitColumn >= 0 ? cellText(row[headerMatch.unitColumn]) || null : null;
      const rate = headerMatch.rateColumn >= 0 ? parseNumber(row[headerMatch.rateColumn]) : null;
      const amount = headerMatch.amountColumn >= 0 ? parseNumber(row[headerMatch.amountColumn]) : null;

      if (!description) {
        continue;
      }

      parsedRows.push({
        description,
        quantity,
        unit,
        rate,
        amount,
        sheet_name: sheetName,
        row_number: headerRowIndex + index + 2,
      });
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
  const buildBoqRows = ({ fileColumns, optionalColumns }: BoqInsertMode) =>
    rows.map((row) => {
      const prediction = predictClassification(row.description);
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
        payload.confidence_score = prediction.confidence_score;
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
      boqError.message.includes("confidence_score");

    if (!canRetrySchemaFallback) {
      break;
    }
  }

  if (boqInsertError) {
    return boqInsertError;
  }

  const { error: learningError } = await supabase.from("ai_training_data").insert(
    rows.map((row) => {
      const prediction = predictClassification(row.description);

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
}: {
  categoryId?: string;
  classification: ReturnType<typeof classifyBoqSystem>;
  row: BoqClassificationRow;
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  systemId?: string;
}) {
  const takeoffQuantity = row.quantity === null || row.quantity === undefined ? null : Number(row.quantity || 0);
  const takeoffUnit = normalizeTakeoffUnit(row.unit);
  const basePayload = {
    category: classification.systemName,
    confidence_score: classification.confidenceScore,
    subcategory: classification.categoryName,
  };
  const updateAttempts: Array<Record<string, unknown>> = [
    {
      ...basePayload,
      classification_confidence: classification.confidenceScore,
      classification_status: "classified",
      system_category_id: categoryId || null,
      system_id: systemId || null,
      takeoff_quantity: takeoffQuantity,
      takeoff_unit: takeoffUnit,
    },
    {
      ...basePayload,
      classification_confidence: classification.confidenceScore,
      classification_status: "classified",
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
      error.message.includes("confidence_score");

    if (!canRetrySchemaFallback) {
      break;
    }
  }

  return lastError || "Unable to update BOQ item classification.";
}

export async function classifyProjectBoqItems(formData: FormData) {
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
    .select("id, description, quantity, unit, amount, category, subcategory")
    .eq("project_id", projectId)
    .eq("user_id", user.id);
  let data: unknown[] | null = boqResult.data;
  let error = boqResult.error;

  if (
    error &&
    (error.message.includes("schema cache") ||
      error.message.includes("amount") ||
      error.message.includes("category") ||
      error.message.includes("subcategory"))
  ) {
    const fallbackResult = await supabase
      .from("boq_items")
      .select("id, description, quantity, unit")
      .eq("project_id", projectId)
      .eq("user_id", user.id);

    data = fallbackResult.data;
    error = fallbackResult.error;
  }

  if (error) {
    return { ok: false, error: error.message } satisfies ProjectDocumentActionResult;
  }

  const rows = (data || []) as BoqClassificationRow[];

  if (rows.length === 0) {
    return { ok: false, error: "No BOQ items found. Upload or parse a BOQ file first." } satisfies ProjectDocumentActionResult;
  }

  const classifications = rows.map((row) => classifyBoqSystem(row.description, row.category, row.subcategory));
  const { categoryIdsByKey, systemIdsByName } = await getSystemReferenceMaps({
    classifications,
    projectId,
    supabase,
    userId: user.id,
  });
  let updatedCount = 0;
  let firstError: string | null = null;

  for (const [index, row] of rows.entries()) {
    const classification = classifications[index];
    const systemId = systemIdsByName.get(classification.systemName);
    const categoryId = systemId ? categoryIdsByKey.get(`${systemId}:${classification.categoryName}`) : undefined;
    const updateError = await updateBoqItemClassification({
      categoryId,
      classification,
      row,
      supabase,
      systemId,
    });

    if (updateError) {
      firstError ||= updateError;
      continue;
    }

    updatedCount += 1;
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
      updatedCount === rows.length
        ? `Classified ${updatedCount} BOQ items into systems.`
        : `Classified ${updatedCount} of ${rows.length} BOQ items. ${firstError || ""}`.trim(),
  } satisfies ProjectDocumentActionResult;
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
