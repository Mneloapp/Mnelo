import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ProjectStatus = "Draft" | "Estimating" | "Procurement" | "Awarded";
export type ProjectRisk = "Low" | "Medium" | "High";

export type BoqItem = {
  id: string;
  system: string;
  description: string;
  quantity: number;
  unit: string;
  unitRate: number;
  confidence: number;
  supplier: string;
};

export type ProjectRow = {
  id: string;
  user_id: string;
  name: string;
  client: string | null;
  location: string | null;
  status: ProjectStatus;
  contract_value: number | null;
  progress: number;
  drawings: number;
  work_type: string | null;
  notes: string | null;
  trade?: string | null;
  risk: ProjectRisk;
  created_at: string;
  updated_at: string;
};

export type Project = {
  id: string;
  name: string;
  client: string;
  location: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  contractValue: number;
  value: string;
  progress: number;
  drawings: number;
  workType: string;
  notes: string;
  risk: ProjectRisk;
  boq: BoqItem[];
};

export type ProjectFileRow = {
  id: string;
  project_id: string;
  user_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  document_type: DocumentType;
  uploaded_at: string;
};

export type ProjectFile = {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: string;
  storagePath: string;
  documentType: DocumentType;
  uploadedAt: string;
};

export type DocumentType = "BOQ Excel" | "Specification PDF" | "Drawing PDF" | "Other";

export type ProjectsQueryResult = {
  projects: Project[];
  errorMessage: string | null;
};

export type ProjectQueryResult = {
  project: Project | null;
  errorMessage: string | null;
};

export type ProjectFilesQueryResult = {
  files: ProjectFile[];
  errorMessage: string | null;
};

const sampleBoq: BoqItem[] = [
  {
    id: "M-104",
    system: "HVAC",
    description: "Variable air volume terminal with reheat coil",
    quantity: 42,
    unit: "ea",
    unitRate: 1840,
    confidence: 94,
    supplier: "Trane",
  },
  {
    id: "E-221",
    system: "Electrical",
    description: "LED troffer fixture, 2x4, dimmable driver",
    quantity: 318,
    unit: "ea",
    unitRate: 128,
    confidence: 91,
    supplier: "Acuity",
  },
  {
    id: "P-048",
    system: "Plumbing",
    description: "Copper domestic cold water pipe, type L",
    quantity: 1840,
    unit: "lf",
    unitRate: 18,
    confidence: 88,
    supplier: "Ferguson",
  },
];

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

function formatUpdatedAt(value: string) {
  const updatedAt = new Date(value);
  const diffMs = Date.now() - updatedAt.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));

  if (diffMinutes < 1) {
    return "Just now";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} min ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours} hr ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kilobytes = bytes / 1024;

  if (kilobytes < 1024) {
    return `${kilobytes.toFixed(1)} KB`;
  }

  return `${(kilobytes / 1024).toFixed(1)} MB`;
}

export function mapProject(row: ProjectRow): Project {
  const contractValue = Number(row.contract_value || 0);

  return {
    id: row.id,
    name: row.name,
    client: row.client || "No client set",
    location: row.location || "No location set",
    status: row.status || "Draft",
    createdAt: formatDate(row.created_at),
    updatedAt: formatUpdatedAt(row.updated_at),
    contractValue,
    value: formatCurrency(contractValue),
    progress: row.progress,
    drawings: row.drawings,
    workType: row.work_type || row.trade || "MEP",
    notes: row.notes || "",
    risk: row.risk,
    boq: sampleBoq,
  };
}

export function mapProjectFile(row: ProjectFileRow): ProjectFile {
  return {
    id: row.id,
    fileName: row.file_name,
    fileType: row.file_type,
    fileSize: formatFileSize(row.file_size),
    storagePath: row.storage_path,
    documentType: row.document_type,
    uploadedAt: formatDate(row.uploaded_at),
  };
}

async function getAuthenticatedUserId() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user.id;
}

export async function getProjectsForCurrentUser() {
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    return {
      projects: [],
      errorMessage: null,
    } satisfies ProjectsQueryResult;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    return {
      projects: [],
      errorMessage: error.message,
    } satisfies ProjectsQueryResult;
  }

  return {
    projects: (data as ProjectRow[]).map(mapProject),
    errorMessage: null,
  } satisfies ProjectsQueryResult;
}

export async function getProjectForCurrentUser(id: string) {
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    return {
      project: null,
      errorMessage: null,
    } satisfies ProjectQueryResult;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return {
      project: null,
      errorMessage: error.message,
    } satisfies ProjectQueryResult;
  }

  return {
    project: data ? mapProject(data as ProjectRow) : null,
    errorMessage: null,
  } satisfies ProjectQueryResult;
}

export async function getProjectFilesForCurrentUser(projectId: string) {
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    return {
      files: [],
      errorMessage: null,
    } satisfies ProjectFilesQueryResult;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("project_files")
    .select("*")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .order("uploaded_at", { ascending: false });

  if (error) {
    return {
      files: [],
      errorMessage: error.message,
    } satisfies ProjectFilesQueryResult;
  }

  return {
    files: (data as ProjectFileRow[]).map(mapProjectFile),
    errorMessage: null,
  } satisfies ProjectFilesQueryResult;
}
