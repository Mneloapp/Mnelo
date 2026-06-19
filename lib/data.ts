import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ProjectStatus = "Estimating" | "Procurement" | "Awarded";
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
  trade: string | null;
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
  updatedAt: string;
  contractValue: number;
  value: string;
  progress: number;
  drawings: number;
  trade: string;
  risk: ProjectRisk;
  boq: BoqItem[];
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

export function mapProject(row: ProjectRow): Project {
  const contractValue = Number(row.contract_value || 0);

  return {
    id: row.id,
    name: row.name,
    client: row.client || "No client set",
    location: row.location || "No location set",
    status: row.status,
    updatedAt: formatUpdatedAt(row.updated_at),
    contractValue,
    value: formatCurrency(contractValue),
    progress: row.progress,
    drawings: row.drawings,
    trade: row.trade || "MEP",
    risk: row.risk,
    boq: sampleBoq,
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
    return [];
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data as ProjectRow[]).map(mapProject);
}

export async function getProjectForCurrentUser(id: string) {
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapProject(data as ProjectRow) : null;
}
