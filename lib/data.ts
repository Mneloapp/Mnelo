import { classifyBoqSystem, NEEDS_REVIEW_SYSTEM, normalizeTakeoffUnit } from "@/lib/classification";
import type { BoqRowType } from "@/lib/boq-cleanup";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ProjectStatus = "Draft" | "Estimating" | "Procurement" | "Awarded";
export type ProjectRisk = "Low" | "Medium" | "High";

export type BoqItem = {
  id: string;
  projectId: string;
  sourceFileId: string | null;
  description: string;
  quantity: number | null;
  unit: string | null;
  rate: number | null;
  amount: number | null;
  category: string;
  subcategory: string;
  classificationSubcategory: string | null;
  confidenceScore: number;
  classificationReason: string | null;
  classificationSource: "ai" | "inherited_header" | "learned" | "needs_review" | "rules";
  needsReview: boolean;
  cleanupReason: string | null;
  inheritedCategory: string | null;
  inheritedSubcategory: string | null;
  rowType: BoqRowType;
  sheetName: string;
  rowNumber: number;
  sectionHeader: string | null;
  sourceRowNumber: number | null;
  sourceSheetName: string | null;
  createdAt: string;
};

export type SystemBoqItem = BoqItem & {
  takeoffQuantity: number | null;
  takeoffUnit: string;
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
  projectId: string;
  fileName: string;
  fileType: string;
  fileSize: string;
  fileSizeBytes: number;
  storagePath: string;
  documentType: DocumentType;
  uploadedAt: string;
  uploadedAtRaw: string;
};

export type DocumentType = "BOQ Excel" | "Specification PDF" | "Drawing PDF" | "Other";

export type BoqItemRow = {
  id: string;
  project_id: string;
  project_file_id: string | null;
  source_file_id?: string | null;
  user_id: string;
  description: string;
  quantity: number | null;
  unit: string | null;
  rate?: number | null;
  amount?: number | null;
  category?: string | null;
  subcategory?: string | null;
  confidence_score?: number | null;
  classification_reason?: string | null;
  classification_source?: string | null;
  classification_subcategory?: string | null;
  cleanup_reason?: string | null;
  inherited_category?: string | null;
  inherited_subcategory?: string | null;
  needs_review?: boolean | null;
  row_type?: string | null;
  section_header?: string | null;
  source_row_number?: number | null;
  source_sheet_name?: string | null;
  takeoff_quantity?: number | null;
  takeoff_unit?: string | null;
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
  cleanupSummary: BoqCleanupSummary;
  errorMessage: string | null;
};

export type BoqCleanupSummary = {
  ignoredRows: number;
  itemRows: number;
  parsedRows: number;
};

export type ProjectSystemCategory = {
  name: string;
  itemCount: number;
  subcategories: ProjectSystemSubcategory[];
  totalAmount: number;
  units: Array<{ unit: string; quantity: number }>;
  items: SystemBoqItem[];
};

export type ProjectSystemSubcategory = {
  name: string;
  itemCount: number;
  totalAmount: number;
  units: Array<{ unit: string; quantity: number }>;
  items: SystemBoqItem[];
};

export type ProjectSystemSummary = {
  name: string;
  itemCount: number;
  totalAmount: number;
  confidenceAverage: number;
  categories: ProjectSystemCategory[];
  units: Array<{ unit: string; quantity: number }>;
};

export type ProjectSystemsQueryResult = {
  systems: ProjectSystemSummary[];
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

export type DashboardProject = Project & {
  boqItemCount: number;
  fileCount: number;
};

export type DashboardActivity = {
  id: string;
  fileName: string;
  projectId: string;
  projectName: string;
  uploadedAt: string;
};

export type DashboardSummary = {
  totalProjects: number;
  boqItems: number;
  files: number;
  storageUsed: string;
};

export type DashboardQueryResult = {
  projects: DashboardProject[];
  recentActivity: DashboardActivity[];
  summary: DashboardSummary;
  errorMessage: string | null;
};

export type GlobalProjectFile = ProjectFile & {
  projectName: string;
  hasParsedBoq: boolean;
};

export type GlobalFilesQueryResult = {
  files: GlobalProjectFile[];
  errorMessage: string | null;
};

export type GlobalBoqItem = BoqItem & {
  projectName: string;
  sourceFileName: string;
};

export type GlobalBoqItemsQueryResult = {
  items: GlobalBoqItem[];
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
    projectId: row.project_id,
    fileName: row.file_name,
    fileType: row.file_type,
    fileSize: formatFileSize(row.file_size),
    fileSizeBytes: row.file_size,
    storagePath: row.storage_path,
    documentType: row.document_type,
    uploadedAt: formatDate(row.uploaded_at),
    uploadedAtRaw: row.uploaded_at,
  };
}

export function mapBoqItem(row: BoqItemRow): BoqItem {
  const rowType =
    row.row_type === "header" ||
    row.row_type === "subtotal" ||
    row.row_type === "total" ||
    row.row_type === "note" ||
    row.row_type === "ignored"
      ? row.row_type
      : "item";
  const classificationSource =
    row.classification_source === "ai" ||
    row.classification_source === "inherited_header" ||
    row.classification_source === "learned" ||
    row.classification_source === "rules" ||
    row.classification_source === "needs_review"
      ? row.classification_source
      : row.category === NEEDS_REVIEW_SYSTEM
        ? "needs_review"
        : "rules";

  return {
    id: row.id,
    projectId: row.project_id,
    sourceFileId: row.source_file_id || row.project_file_id,
    description: row.description,
    quantity: row.quantity === null ? null : Number(row.quantity || 0),
    unit: row.unit,
    rate: row.rate === null || row.rate === undefined ? null : Number(row.rate || 0),
    amount: row.amount === null || row.amount === undefined ? null : Number(row.amount || 0),
    category: row.category || "General",
    subcategory: row.subcategory || "Unclassified",
    classificationSubcategory: row.classification_subcategory || null,
    confidenceScore: Number(row.confidence_score || 0),
    classificationReason: row.classification_reason || null,
    classificationSource,
    cleanupReason: row.cleanup_reason || null,
    inheritedCategory: row.inherited_category || null,
    inheritedSubcategory: row.inherited_subcategory || null,
    needsReview: Boolean(row.needs_review) || classificationSource === "needs_review" || row.category === NEEDS_REVIEW_SYSTEM,
    rowType,
    sheetName: row.sheet_name,
    rowNumber: row.row_number,
    sectionHeader: row.section_header || null,
    sourceRowNumber: row.source_row_number === null || row.source_row_number === undefined ? null : Number(row.source_row_number),
    sourceSheetName: row.source_sheet_name || null,
    createdAt: formatDate(row.created_at),
  };
}

function getBoqCleanupSummary(items: BoqItem[]) {
  const parsedRows = items.length;
  const itemRows = items.filter((item) => item.rowType === "item").length;

  return {
    ignoredRows: parsedRows - itemRows,
    itemRows,
    parsedRows,
  } satisfies BoqCleanupSummary;
}

function filterBoqRowsForExistingFiles(rows: BoqItemRow[], validFileIds: Set<string>) {
  if (validFileIds.size === 0) {
    return [];
  }

  return rows.filter((row) => {
    const sourceFileId = row.source_file_id || row.project_file_id;

    return Boolean(sourceFileId && validFileIds.has(sourceFileId));
  });
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

export async function getDashboardForCurrentUser() {
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    return {
      projects: [],
      recentActivity: [],
      summary: {
        totalProjects: 0,
        boqItems: 0,
        files: 0,
        storageUsed: "0 B",
      },
      errorMessage: null,
    } satisfies DashboardQueryResult;
  }

  const supabase = await createSupabaseServerClient();
  const [projectsResult, filesResult, boqResult] = await Promise.all([
    supabase.from("projects").select("*").eq("user_id", userId).order("updated_at", { ascending: false }),
    supabase.from("project_files").select("*").eq("user_id", userId).order("uploaded_at", { ascending: false }),
    supabase.from("boq_items").select("id, project_id, row_type").eq("user_id", userId),
  ]);

  if (projectsResult.error) {
    return {
      projects: [],
      recentActivity: [],
      summary: {
        totalProjects: 0,
        boqItems: 0,
        files: 0,
        storageUsed: "0 B",
      },
      errorMessage: projectsResult.error.message,
    } satisfies DashboardQueryResult;
  }

  const projectRows = (projectsResult.data || []) as ProjectRow[];
  const projects = projectRows.map(mapProject);
  const files = filesResult.error ? [] : ((filesResult.data || []) as ProjectFileRow[]);
  const boqItems = boqResult.error
    ? []
    : ((boqResult.data || []) as Array<{ id: string; project_id: string; row_type?: string | null }>).filter(
        (item) => !item.row_type || item.row_type === "item",
      );
  const projectNames = new Map(projects.map((project) => [project.id, project.name]));
  const fileCounts = new Map<string, number>();
  const boqCounts = new Map<string, number>();
  const storageBytes = files.reduce((total, file) => total + Number(file.file_size || 0), 0);

  for (const file of files) {
    fileCounts.set(file.project_id, (fileCounts.get(file.project_id) || 0) + 1);
  }

  for (const item of boqItems) {
    boqCounts.set(item.project_id, (boqCounts.get(item.project_id) || 0) + 1);
  }

  return {
    projects: projects.map((project) => ({
      ...project,
      boqItemCount: boqCounts.get(project.id) || 0,
      fileCount: fileCounts.get(project.id) || 0,
    })),
    recentActivity: files.slice(0, 6).map((file) => ({
      id: file.id,
      fileName: file.file_name,
      projectId: file.project_id,
      projectName: projectNames.get(file.project_id) || "Project",
      uploadedAt: formatUpdatedAt(file.uploaded_at),
    })),
    summary: {
      totalProjects: projects.length,
      boqItems: boqItems.length,
      files: files.length,
      storageUsed: formatFileSize(storageBytes),
    },
    errorMessage: filesResult.error?.message || boqResult.error?.message || null,
  } satisfies DashboardQueryResult;
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

export async function getFilesForCurrentUser() {
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    return {
      files: [],
      errorMessage: null,
    } satisfies GlobalFilesQueryResult;
  }

  const supabase = await createSupabaseServerClient();
  const [projectsResult, filesResult, boqResult] = await Promise.all([
    supabase.from("projects").select("id, name").eq("user_id", userId),
    supabase.from("project_files").select("*").eq("user_id", userId).order("uploaded_at", { ascending: false }),
    supabase.from("boq_items").select("source_file_id, project_file_id").eq("user_id", userId),
  ]);

  if (filesResult.error) {
    return {
      files: [],
      errorMessage: filesResult.error.message,
    } satisfies GlobalFilesQueryResult;
  }

  const projectNames = new Map(
    ((projectsResult.data || []) as Array<{ id: string; name: string }>).map((project) => [project.id, project.name]),
  );
  const parsedFileIds = new Set(
    boqResult.error
      ? []
      : ((boqResult.data || []) as Array<{ source_file_id?: string | null; project_file_id?: string | null }>)
          .map((item) => item.source_file_id || item.project_file_id)
          .filter((fileId): fileId is string => Boolean(fileId)),
  );

  return {
    files: ((filesResult.data || []) as ProjectFileRow[]).map((row) => ({
      ...mapProjectFile(row),
      projectName: projectNames.get(row.project_id) || "Project",
      hasParsedBoq: parsedFileIds.has(row.id),
    })),
    errorMessage: projectsResult.error?.message || boqResult.error?.message || null,
  } satisfies GlobalFilesQueryResult;
}

export async function getBoqItemsForCurrentUser(projectId: string) {
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    return {
      items: [],
      cleanupSummary: { ignoredRows: 0, itemRows: 0, parsedRows: 0 },
      errorMessage: null,
    } satisfies BoqItemsQueryResult;
  }

  const supabase = await createSupabaseServerClient();
  const [filesResult, boqResult] = await Promise.all([
    supabase.from("project_files").select("id").eq("project_id", projectId).eq("user_id", userId),
    supabase
      .from("boq_items")
      .select("*")
      .eq("project_id", projectId)
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .order("sheet_name", { ascending: true })
      .order("row_number", { ascending: true }),
  ]);

  if (boqResult.error) {
    return {
      items: [],
      cleanupSummary: { ignoredRows: 0, itemRows: 0, parsedRows: 0 },
      errorMessage: boqResult.error.message,
    } satisfies BoqItemsQueryResult;
  }

  const validFileIds = new Set(((filesResult.data || []) as Array<{ id: string }>).map((file) => file.id));
  const rows = filterBoqRowsForExistingFiles((boqResult.data || []) as BoqItemRow[], validFileIds);
  const items = rows.map(mapBoqItem);

  return {
    cleanupSummary: getBoqCleanupSummary(items),
    items,
    errorMessage: filesResult.error?.message || null,
  } satisfies BoqItemsQueryResult;
}

function sortedUnitTotals(unitTotals: Map<string, number>) {
  return Array.from(unitTotals.entries())
    .map(([unit, quantity]) => ({ quantity, unit }))
    .sort((a, b) => b.quantity - a.quantity);
}

export async function getProjectSystemsForCurrentUser(projectId: string) {
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    return {
      systems: [],
      errorMessage: null,
    } satisfies ProjectSystemsQueryResult;
  }

  const supabase = await createSupabaseServerClient();
  const [filesResult, boqResult] = await Promise.all([
    supabase.from("project_files").select("id").eq("project_id", projectId).eq("user_id", userId),
    supabase
      .from("boq_items")
      .select("*")
      .eq("project_id", projectId)
      .eq("user_id", userId)
      .order("row_number", { ascending: true }),
  ]);

  if (boqResult.error) {
    return {
      systems: [],
      errorMessage: boqResult.error.message,
    } satisfies ProjectSystemsQueryResult;
  }

  const validFileIds = new Set(((filesResult.data || []) as Array<{ id: string }>).map((file) => file.id));
  const rows = filterBoqRowsForExistingFiles((boqResult.data || []) as BoqItemRow[], validFileIds);

  const systems = new Map<
    string,
    {
      categories: Map<
        string,
        ProjectSystemCategory & {
          subcategoryTotals: Map<string, ProjectSystemSubcategory & { unitTotals: Map<string, number> }>;
          unitTotals: Map<string, number>;
        }
      >;
      confidenceTotal: number;
      itemCount: number;
      name: string;
      totalAmount: number;
      unitTotals: Map<string, number>;
    }
  >();

  for (const row of rows) {
    if (row.row_type && row.row_type !== "item") {
      continue;
    }

    const item = mapBoqItem(row);
    const classification = classifyBoqSystem(item.description, item.category, item.subcategory, item.classificationSubcategory);
    const systemName = item.category && item.category !== "General" ? item.category : classification.systemName;
    const categoryName =
      item.subcategory && item.subcategory !== "Unclassified" ? item.subcategory : classification.categoryName;
    const subcategoryName = item.classificationSubcategory || classification.subcategoryName || "Unclassified";
    const takeoffQuantity =
      row.takeoff_quantity === null || row.takeoff_quantity === undefined
        ? item.quantity
        : Number(row.takeoff_quantity || 0);
    const takeoffUnit = normalizeTakeoffUnit(row.takeoff_unit || item.unit);
    const systemItem = {
      ...item,
      takeoffQuantity,
      takeoffUnit,
    } satisfies SystemBoqItem;
    const system = systems.get(systemName) || {
      categories: new Map<
        string,
        ProjectSystemCategory & {
          subcategoryTotals: Map<string, ProjectSystemSubcategory & { unitTotals: Map<string, number> }>;
          unitTotals: Map<string, number>;
        }
      >(),
      confidenceTotal: 0,
      itemCount: 0,
      name: systemName,
      totalAmount: 0,
      unitTotals: new Map<string, number>(),
    };
    const category = system.categories.get(categoryName) || {
      itemCount: 0,
      items: [],
      name: categoryName,
      subcategories: [],
      subcategoryTotals: new Map<string, ProjectSystemSubcategory & { unitTotals: Map<string, number> }>(),
      totalAmount: 0,
      unitTotals: new Map<string, number>(),
      units: [],
    };
    const subcategory = category.subcategoryTotals.get(subcategoryName) || {
      itemCount: 0,
      items: [],
      name: subcategoryName,
      totalAmount: 0,
      unitTotals: new Map<string, number>(),
      units: [],
    };

    system.itemCount += 1;
    system.totalAmount += item.amount || 0;
    system.confidenceTotal += item.confidenceScore || classification.confidenceScore;
    category.itemCount += 1;
    category.totalAmount += item.amount || 0;
    category.items.push(systemItem);
    subcategory.itemCount += 1;
    subcategory.totalAmount += item.amount || 0;
    subcategory.items.push(systemItem);

    if (takeoffQuantity !== null) {
      system.unitTotals.set(takeoffUnit, (system.unitTotals.get(takeoffUnit) || 0) + takeoffQuantity);
      category.unitTotals.set(takeoffUnit, (category.unitTotals.get(takeoffUnit) || 0) + takeoffQuantity);
      subcategory.unitTotals.set(takeoffUnit, (subcategory.unitTotals.get(takeoffUnit) || 0) + takeoffQuantity);
    }

    category.subcategoryTotals.set(subcategoryName, subcategory);
    system.categories.set(categoryName, category);
    systems.set(systemName, system);
  }

  return {
    systems: Array.from(systems.values())
      .map((system) => ({
        categories: Array.from(system.categories.values())
          .map((category) => ({
            itemCount: category.itemCount,
            items: category.items,
            name: category.name,
            subcategories: Array.from(category.subcategoryTotals.values())
              .map((subcategory) => ({
                itemCount: subcategory.itemCount,
                items: subcategory.items,
                name: subcategory.name,
                totalAmount: subcategory.totalAmount,
                units: sortedUnitTotals(subcategory.unitTotals),
              }))
              .sort((a, b) => b.itemCount - a.itemCount),
            totalAmount: category.totalAmount,
            units: sortedUnitTotals(category.unitTotals),
          }))
          .sort((a, b) => b.itemCount - a.itemCount),
        confidenceAverage: system.itemCount > 0 ? Math.round((system.confidenceTotal / system.itemCount) * 100) : 0,
        itemCount: system.itemCount,
        name: system.name,
        totalAmount: system.totalAmount,
        units: sortedUnitTotals(system.unitTotals),
      }))
      .sort((a, b) => b.itemCount - a.itemCount),
    errorMessage: filesResult.error?.message || null,
  } satisfies ProjectSystemsQueryResult;
}

export async function getBoqItemsAcrossCurrentUser() {
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    return {
      items: [],
      errorMessage: null,
    } satisfies GlobalBoqItemsQueryResult;
  }

  const supabase = await createSupabaseServerClient();
  const [projectsResult, filesResult, boqResult] = await Promise.all([
    supabase.from("projects").select("id, name").eq("user_id", userId),
    supabase.from("project_files").select("id, file_name").eq("user_id", userId),
    supabase
      .from("boq_items")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .order("sheet_name", { ascending: true })
      .order("row_number", { ascending: true }),
  ]);

  if (boqResult.error) {
    return {
      items: [],
      errorMessage: boqResult.error.message,
    } satisfies GlobalBoqItemsQueryResult;
  }

  const projectNames = new Map(
    ((projectsResult.data || []) as Array<{ id: string; name: string }>).map((project) => [project.id, project.name]),
  );
  const fileNames = new Map(
    ((filesResult.data || []) as Array<{ id: string; file_name: string }>).map((file) => [file.id, file.file_name]),
  );

  return {
    items: ((boqResult.data || []) as BoqItemRow[]).filter((row) => !row.row_type || row.row_type === "item").map((row) => {
      const item = mapBoqItem(row);
      const sourceFileId = row.source_file_id || row.project_file_id || "";

      return {
        ...item,
        projectName: projectNames.get(row.project_id) || "Project",
        sourceFileName: fileNames.get(sourceFileId) || "Source file",
      };
    }),
    errorMessage: projectsResult.error?.message || filesResult.error?.message || null,
  } satisfies GlobalBoqItemsQueryResult;
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
