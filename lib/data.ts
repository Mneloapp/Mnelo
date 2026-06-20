import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ProjectStatus = "Draft" | "Estimating" | "Procurement" | "Awarded";
export type ProjectRisk = "Low" | "Medium" | "High";

export type BoqItem = {
  id: string;
  projectId: string;
  sourceFileId: string | null;
  description: string;
  quantity: number;
  unit: string;
  sheetName: string;
  rowNumber: number;
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

export type BoqItemRow = {
  id: string;
  project_id: string;
  project_file_id: string | null;
  user_id: string;
  description: string;
  quantity: number;
  unit: string;
  sheet_name: string;
  row_number: number;
  created_at: string;
};

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

export type BoqItemsQueryResult = {
  items: BoqItem[];
  errorMessage: string | null;
};

export type LearningRecordRow = {
  id: string;
  project_id: string | null;
  source_file_id: string | null;
  user_id: string;
  item_description: string | null;
  predicted_category: string | null;
  predicted_subcategory: string | null;
  predicted_supplier_type: string | null;
  confidence_score: number | null;
  user_corrected_category: string | null;
  user_corrected_subcategory: string | null;
  final_category: string | null;
  final_subcategory: string | null;
  created_at: string;
};

export type LearningRecord = {
  id: string;
  projectId: string | null;
  sourceFileId: string | null;
  itemDescription: string;
  predictedCategory: string;
  predictedSubcategory: string;
  predictedSupplierType: string;
  confidenceScore: number;
  userCorrectedCategory: string | null;
  userCorrectedSubcategory: string | null;
  finalCategory: string;
  finalSubcategory: string;
  createdAt: string;
};

export type LearningSummary = {
  totalRecords: number;
  correctionRate: number;
  mostCommonCategories: Array<{ category: string; count: number }>;
  mostCorrectedClassifications: Array<{ from: string; to: string; count: number }>;
  recentRecords: LearningRecord[];
  errorMessage: string | null;
};

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
    workType: row.work_type || row.trade || "General",
    notes: row.notes || "",
    risk: row.risk,
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

export function mapBoqItem(row: BoqItemRow): BoqItem {
  return {
    id: row.id,
    projectId: row.project_id,
    sourceFileId: row.project_file_id,
    description: row.description,
    quantity: Number(row.quantity || 0),
    unit: row.unit,
    sheetName: row.sheet_name,
    rowNumber: row.row_number,
  };
}

export function mapLearningRecord(row: LearningRecordRow): LearningRecord {
  const predictedCategory = row.predicted_category || "General";
  const predictedSubcategory = row.predicted_subcategory || "Unclassified";

  return {
    id: row.id,
    projectId: row.project_id,
    sourceFileId: row.source_file_id,
    itemDescription: row.item_description || "No description",
    predictedCategory,
    predictedSubcategory,
    predictedSupplierType: row.predicted_supplier_type || "General supplier",
    confidenceScore: Number(row.confidence_score || 0),
    userCorrectedCategory: row.user_corrected_category,
    userCorrectedSubcategory: row.user_corrected_subcategory,
    finalCategory: row.final_category || row.user_corrected_category || predictedCategory,
    finalSubcategory: row.final_subcategory || row.user_corrected_subcategory || predictedSubcategory,
    createdAt: formatDate(row.created_at),
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

export async function getBoqItemsForCurrentUser(projectId: string) {
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    return {
      items: [],
      errorMessage: null,
    } satisfies BoqItemsQueryResult;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("boq_items")
    .select("*")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .order("sheet_name", { ascending: true })
    .order("row_number", { ascending: true });

  if (error) {
    return {
      items: [],
      errorMessage: error.message,
    } satisfies BoqItemsQueryResult;
  }

  return {
    items: (data as BoqItemRow[]).map(mapBoqItem),
    errorMessage: null,
  } satisfies BoqItemsQueryResult;
}

export async function getLearningRecordsForCurrentUser(projectId: string) {
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    return {
      records: [],
      errorMessage: null,
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("ai_training_data")
    .select("*")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    return {
      records: [],
      errorMessage: error.message,
    };
  }

  return {
    records: (data as LearningRecordRow[]).map(mapLearningRecord),
    errorMessage: null,
  };
}

export async function getLearningSummaryForCurrentUser() {
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    return {
      totalRecords: 0,
      correctionRate: 0,
      mostCommonCategories: [],
      mostCorrectedClassifications: [],
      recentRecords: [],
      errorMessage: null,
    } satisfies LearningSummary;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("ai_training_data")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    return {
      totalRecords: 0,
      correctionRate: 0,
      mostCommonCategories: [],
      mostCorrectedClassifications: [],
      recentRecords: [],
      errorMessage: error.message,
    } satisfies LearningSummary;
  }

  const records = (data as LearningRecordRow[]).map(mapLearningRecord);
  const correctedRecords = records.filter((record) => record.userCorrectedCategory || record.userCorrectedSubcategory);
  const categoryCounts = new Map<string, number>();
  const correctionCounts = new Map<string, { from: string; to: string; count: number }>();

  for (const record of records) {
    const category = record.finalCategory || record.predictedCategory || "General";
    categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);

    if (record.userCorrectedCategory && record.userCorrectedCategory !== record.predictedCategory) {
      const key = `${record.predictedCategory}->${record.userCorrectedCategory}`;
      const existing = correctionCounts.get(key);
      correctionCounts.set(key, {
        from: record.predictedCategory,
        to: record.userCorrectedCategory,
        count: (existing?.count || 0) + 1,
      });
    }
  }

  return {
    totalRecords: records.length,
    correctionRate: records.length > 0 ? Math.round((correctedRecords.length / records.length) * 100) : 0,
    mostCommonCategories: Array.from(categoryCounts.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6),
    mostCorrectedClassifications: Array.from(correctionCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 6),
    recentRecords: records.slice(0, 8),
    errorMessage: null,
  } satisfies LearningSummary;
}
