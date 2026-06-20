"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as XLSX from "xlsx";
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
const learningCategories = [
  {
    category: "HVAC",
    subcategory: "Mechanical systems",
    supplierType: "Specialist contractor",
    keywords: ["ahu", "air handling", "duct", "diffuser", "fan coil", "hvac", "chiller", "ventilation"],
  },
  {
    category: "Electrical",
    subcategory: "Power and controls",
    supplierType: "Electrical supplier",
    keywords: ["cable", "switchgear", "panel", "lighting", "conduit", "generator", "transformer", "electrical"],
  },
  {
    category: "Furniture",
    subcategory: "Fixtures and furnishings",
    supplierType: "Furniture supplier",
    keywords: ["desk", "chair", "table", "cabinet", "furniture", "workstation", "sofa"],
  },
  {
    category: "Medical Equipment",
    subcategory: "Clinical equipment",
    supplierType: "Medical equipment supplier",
    keywords: ["medical", "clinical", "patient", "scanner", "bedhead", "laboratory", "hospital"],
  },
  {
    category: "Industrial Equipment",
    subcategory: "Plant and machinery",
    supplierType: "Industrial equipment supplier",
    keywords: ["machine", "compressor", "pump", "conveyor", "industrial", "motor", "tank", "valve"],
  },
  {
    category: "Software",
    subcategory: "Digital systems",
    supplierType: "Software vendor",
    keywords: ["software", "license", "platform", "subscription", "integration", "api", "dashboard"],
  },
  {
    category: "Construction Materials",
    subcategory: "Materials and finishes",
    supplierType: "Materials supplier",
    keywords: ["concrete", "steel", "cement", "timber", "block", "tile", "paint", "gypsum", "aggregate"],
  },
  {
    category: "Renewable Energy",
    subcategory: "Energy systems",
    supplierType: "Energy systems supplier",
    keywords: ["solar", "pv", "battery", "inverter", "renewable", "wind", "energy storage"],
  },
  {
    category: "Logistics",
    subcategory: "Freight and handling",
    supplierType: "Logistics provider",
    keywords: ["freight", "shipping", "delivery", "transport", "logistics", "warehouse", "customs"],
  },
  {
    category: "Office Supplies",
    subcategory: "Consumables",
    supplierType: "Office supplier",
    keywords: ["paper", "stationery", "printer", "toner", "office supplies", "folder"],
  },
] as const;

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
  const normalizedDescription = description.toLowerCase();
  const match = learningCategories
    .map((category) => ({
      ...category,
      matches: category.keywords.filter((keyword) => normalizedDescription.includes(keyword)).length,
    }))
    .sort((a, b) => b.matches - a.matches)[0];

  if (!match?.matches) {
    return {
      predicted_category: "General",
      predicted_subcategory: "Unclassified",
      predicted_supplier_type: "General supplier",
      confidence_score: 0.35,
    };
  }

  return {
    predicted_category: match.category,
    predicted_subcategory: match.subcategory,
    predicted_supplier_type: match.supplierType,
    confidence_score: Math.min(0.95, 0.58 + match.matches * 0.12),
  };
}

function selectHeaderMatch(rows: unknown[][], mapping?: ColumnMapping | null) {
  return rows.slice(0, 20).map((row, index) => {
    const descriptionColumn =
      mapping?.description ? findMappedColumn(row, mapping.description) : findColumn(row, descriptionHeaders);
    const quantityColumn =
      mapping?.quantity ? findMappedColumn(row, mapping.quantity) : findColumn(row, quantityHeaders);
    const unitColumn = mapping?.unit ? findMappedColumn(row, mapping.unit) : findColumn(row, unitHeaders);
    const rateColumn = mapping?.rate ? findMappedColumn(row, mapping.rate) : findColumn(row, rateHeaders);
    const amountColumn = mapping?.amount ? findMappedColumn(row, mapping.amount) : findColumn(row, amountHeaders);
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
    const candidate = rows.slice(0, 20).find((row) => uniqueColumnOptions(row).length > 1);

    if (candidate) {
      return uniqueColumnOptions(candidate);
    }
  }

  return [];
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

  if (!mapping && bestScore < 6) {
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
  const { error: boqError } = await supabase.from("boq_items").insert(
    rows.map((row) => {
      const prediction = predictClassification(row.description);

      return {
        project_id: projectId,
        project_file_id: projectFileId,
        source_file_id: projectFileId,
        user_id: userId,
        description: row.description,
        quantity: row.quantity,
        unit: row.unit,
        rate: row.rate,
        amount: row.amount,
        category: prediction.predicted_category,
        subcategory: prediction.predicted_subcategory,
        confidence_score: prediction.confidence_score,
        sheet_name: row.sheet_name,
        row_number: row.row_number,
      };
    }),
  );

  if (boqError) {
    return boqError.message;
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
    await supabase.from("boq_items").delete().eq("source_file_id", projectFileId).eq("user_id", userId);
    return learningError.message;
  }

  return null;
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
    return { ok: false, error: mappingError.message } satisfies ProjectDocumentActionResult;
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

  await supabase.from("boq_items").delete().eq("source_file_id", projectFileId).eq("user_id", user.id);

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

  await supabase.from("boq_items").delete().eq("source_file_id", projectFileId).eq("user_id", user.id);

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
