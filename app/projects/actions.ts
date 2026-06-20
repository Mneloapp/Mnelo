"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as XLSX from "xlsx";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { DocumentType } from "@/lib/data";

const documentTypes = ["BOQ Excel", "Specification PDF", "Drawing PDF", "Other"] satisfies DocumentType[];
const allowedExtensions = [".xlsx", ".xls", ".pdf"];
const descriptionHeaders = ["description", "desc", "item description", "item", "scope", "work item"];
const quantityHeaders = ["quantity", "qty", "q'ty", "qnty", "amount"];
const unitHeaders = ["unit", "uom", "unit of measure", "units"];

type ParsedBoqRow = {
  description: string;
  quantity: number;
  unit: string;
  sheet_name: string;
  row_number: number;
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
    .replace(/\s+/g, " ");
}

function findColumn(headers: unknown[], names: string[]) {
  return headers.findIndex((header) => names.includes(normalizeHeader(header)));
}

function parseQuantity(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const parsed = Number(
    String(value || "")
      .replace(/,/g, "")
      .trim(),
  );

  return Number.isFinite(parsed) ? parsed : null;
}

async function parseBoqWorkbook(file: File) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const parsedRows: ParsedBoqRow[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      blankrows: false,
      defval: "",
      header: 1,
      raw: true,
    });
    const headerRowIndex = rows.findIndex((row) => {
      const descriptionColumn = findColumn(row, descriptionHeaders);
      const quantityColumn = findColumn(row, quantityHeaders);
      const unitColumn = findColumn(row, unitHeaders);
      return descriptionColumn >= 0 && quantityColumn >= 0 && unitColumn >= 0;
    });

    if (headerRowIndex < 0) {
      continue;
    }

    const headers = rows[headerRowIndex];
    const descriptionColumn = findColumn(headers, descriptionHeaders);
    const quantityColumn = findColumn(headers, quantityHeaders);
    const unitColumn = findColumn(headers, unitHeaders);

    for (const [index, row] of rows.slice(headerRowIndex + 1).entries()) {
      const description = String(row[descriptionColumn] || "").trim();
      const quantity = parseQuantity(row[quantityColumn]);
      const unit = String(row[unitColumn] || "").trim();

      if (!description || quantity === null || !unit) {
        continue;
      }

      parsedRows.push({
        description,
        quantity,
        unit,
        sheet_name: sheetName,
        row_number: headerRowIndex + index + 2,
      });
    }
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
    const rows = await parseBoqWorkbook(file);

    if (rows.length > 0) {
      const { error: boqError } = await supabase.from("boq_items").insert(
        rows.map((row) => ({
          project_id: projectId,
          project_file_id: projectFile.id,
          user_id: user.id,
          description: row.description,
          quantity: row.quantity,
          unit: row.unit,
          sheet_name: row.sheet_name,
          row_number: row.row_number,
        })),
      );

      if (boqError) {
        redirect(`/projects/${projectId}?error=${encodeURIComponent(boqError.message)}`);
      }
    }
  }

  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}`);
}
