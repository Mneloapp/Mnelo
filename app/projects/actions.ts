"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as XLSX from "xlsx";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { DocumentType } from "@/lib/data";

const documentTypes = ["BOQ Excel", "Specification PDF", "Drawing PDF", "Other"] satisfies DocumentType[];
const allowedExtensions = [".xlsx", ".xls", ".pdf"];
const descriptionHeaders = ["description", "desc", "item description", "item", "item name", "name", "scope", "work item"];
const quantityHeaders = ["quantity", "qty", "q'ty", "qnty"];
const unitHeaders = ["unit", "uom", "unit of measure", "units"];
const rateHeaders = ["rate", "unit rate", "unit price", "price", "cost"];
const amountHeaders = ["amount", "total", "total amount", "line total", "extended amount"];
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

type ClassificationPrediction = {
  predicted_category: string;
  predicted_subcategory: string;
  predicted_supplier_type: string;
  confidence_score: number;
};

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
    .replace(/[_/.-]+/g, " ")
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

async function parseBoqWorkbook(file: File) {
  let workbook: XLSX.WorkBook;
  const parsedRows: ParsedBoqRow[] = [];

  try {
    const buffer = await file.arrayBuffer();
    workbook = XLSX.read(buffer, { cellDates: true, dense: false, type: "array" });
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Unable to read Excel workbook.");
  }

  if (workbook.SheetNames.length === 0) {
    throw new Error("Workbook has no sheets.");
  }


  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      blankrows: false,
      defval: "",
      header: 1,
      raw: true,
    });

    const headerCandidates = rows.slice(0, 30).map((row, index) => {
      const descriptionColumn = findColumn(row, descriptionHeaders);
      const quantityColumn = findColumn(row, quantityHeaders);
      const unitColumn = findColumn(row, unitHeaders);
      const rateColumn = findColumn(row, rateHeaders);
      const amountColumn = findColumn(row, amountHeaders);
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
    });
    const headerMatch = headerCandidates
      .filter((candidate) => candidate.descriptionColumn >= 0)
      .sort((a, b) => b.score - a.score)[0];
    const headerRowIndex = headerMatch?.index ?? -1;

    if (headerRowIndex < 0) {
      continue;
    }

    const headers = rows[headerRowIndex];
    const descriptionColumn = findColumn(headers, descriptionHeaders);
    const quantityColumn = findColumn(headers, quantityHeaders);
    const unitColumn = findColumn(headers, unitHeaders);
    const rateColumn = findColumn(headers, rateHeaders);
    const amountColumn = findColumn(headers, amountHeaders);

    for (const [index, row] of rows.slice(headerRowIndex + 1).entries()) {
      const description = cellText(row[descriptionColumn]);
      const quantity = quantityColumn >= 0 ? parseNumber(row[quantityColumn]) : null;
      const unit = unitColumn >= 0 ? cellText(row[unitColumn]) || null : null;
      const rate = rateColumn >= 0 ? parseNumber(row[rateColumn]) : null;
      const amount = amountColumn >= 0 ? parseNumber(row[amountColumn]) : null;

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

  if (parsedRows.length === 0) {
    throw new Error(
      "No BOQ rows were parsed. Expected a header row with a description, item, or name column, plus optional quantity, unit, rate, or amount columns.",
    );
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
    redirect("/projects?error=Missing%20project%20id.");
  }

  if (!(file instanceof File) || file.size === 0) {
    redirect(`/projects/${projectId}?error=${encodeURIComponent("Choose a BOQ or tender document to upload.")}`);
  }

  const extension = getFileExtension(file.name);

  if (!allowedExtensions.includes(extension)) {
    redirect(
      `/projects/${projectId}?error=${encodeURIComponent("Only .xlsx, .xls, and .pdf files are supported.")}`,
    );
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

  const storagePath = `${user.id}/${projectId}/${crypto.randomUUID()}-${sanitizeFileName(file.name)}`;
  const { error: uploadError } = await supabase.storage.from("project-documents").upload(storagePath, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });

  if (uploadError) {
    redirect(`/projects/${projectId}?error=${encodeURIComponent(uploadError.message)}`);
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
    redirect(`/projects/${projectId}?error=${encodeURIComponent(insertError.message)}`);
  }

  if (extension === ".xlsx" || extension === ".xls") {
    let rows: ParsedBoqRow[];

    try {
      rows = await parseBoqWorkbook(file);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Excel parsing failed.";
      redirect(`/projects/${projectId}?error=${encodeURIComponent(message)}`);
    }

    if (rows.length > 0) {
      const { error: boqError } = await supabase.from("boq_items").insert(
        rows.map((row) => {
          const prediction = predictClassification(row.description);

          return {
            project_id: projectId,
            project_file_id: projectFile.id,
            source_file_id: projectFile.id,
            user_id: user.id,
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
        redirect(`/projects/${projectId}?error=${encodeURIComponent(boqError.message)}`);
      }

      const { error: learningError } = await supabase.from("ai_training_data").insert(
        rows.map((row) => {
          const prediction = predictClassification(row.description);

          return {
            project_id: projectId,
            source_file_id: projectFile.id,
            user_id: user.id,
            source_type: "boq_item",
            source_id: projectFile.id,
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
        await supabase.from("boq_items").delete().eq("source_file_id", projectFile.id).eq("user_id", user.id);
        redirect(`/projects/${projectId}?error=${encodeURIComponent(learningError.message)}`);
      }
    }
  }

  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}`);
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
  const confirmed = readString(formData, "confirmed") === "true";

  if (!projectId || !fileId) {
    redirect(`/projects/${projectId || ""}?error=${encodeURIComponent("Missing file deletion details.")}`);
  }

  const { supabase, user, error: userError } = await getAuthenticatedUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { data: projectFile, error: fileError } = await supabase
    .from("project_files")
    .select("id, storage_path")
    .eq("id", fileId)
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fileError || !projectFile) {
    redirect(`/projects/${projectId}?error=${encodeURIComponent(fileError?.message || "File not found.")}`);
  }

  const { count: parsedCount, error: countError } = await supabase
    .from("boq_items")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .or(`source_file_id.eq.${fileId},project_file_id.eq.${fileId}`);

  if (countError) {
    redirect(`/projects/${projectId}?error=${encodeURIComponent(countError.message)}`);
  }

  if ((parsedCount || 0) > 0 && !confirmed) {
    redirect(
      `/projects/${projectId}?error=${encodeURIComponent("Delete file and all parsed BOQ data?")}`,
    );
  }

  const { error: learningError } = await supabase
    .from("ai_training_data")
    .delete()
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .eq("source_file_id", fileId);

  if (learningError) {
    redirect(`/projects/${projectId}?error=${encodeURIComponent(learningError.message)}`);
  }

  const { error: boqError } = await supabase
    .from("boq_items")
    .delete()
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .or(`source_file_id.eq.${fileId},project_file_id.eq.${fileId}`);

  if (boqError) {
    redirect(`/projects/${projectId}?error=${encodeURIComponent(boqError.message)}`);
  }

  const { error: fileDeleteError } = await supabase
    .from("project_files")
    .delete()
    .eq("id", fileId)
    .eq("project_id", projectId)
    .eq("user_id", user.id);

  if (fileDeleteError) {
    redirect(`/projects/${projectId}?error=${encodeURIComponent(fileDeleteError.message)}`);
  }

  const { error: storageError } = await supabase.storage
    .from("project-documents")
    .remove([projectFile.storage_path]);

  if (storageError) {
    redirect(`/projects/${projectId}?error=${encodeURIComponent(storageError.message)}`);
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/learning");
  redirect(`/projects/${projectId}?message=${encodeURIComponent("File deleted successfully.")}`);
}
