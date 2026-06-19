"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ProjectRisk, ProjectStatus } from "@/lib/data";

const projectStatuses = ["Estimating", "Procurement", "Awarded"] satisfies ProjectStatus[];
const projectRisks = ["Low", "Medium", "High"] satisfies ProjectRisk[];

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readNumber(formData: FormData, key: string) {
  const value = readString(formData, key);
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function createProject(formData: FormData) {
  const name = readString(formData, "name");
  const client = readString(formData, "client");
  const location = readString(formData, "location");
  const trade = readString(formData, "trade") || "MEP";
  const contractValue = readNumber(formData, "contractValue");
  const statusValue = readString(formData, "status");
  const riskValue = readString(formData, "risk");
  const status = projectStatuses.includes(statusValue as ProjectStatus)
    ? (statusValue as ProjectStatus)
    : "Estimating";
  const risk = projectRisks.includes(riskValue as ProjectRisk) ? (riskValue as ProjectRisk) : "Low";

  if (!name) {
    redirect("/projects?error=Project%20name%20is%20required.");
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { error } = await supabase.from("projects").insert({
    user_id: user.id,
    name,
    client: client || null,
    location: location || null,
    trade,
    contract_value: contractValue,
    status,
    risk,
  });

  if (error) {
    redirect(`/projects?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard");
  revalidatePath("/projects");
  redirect("/projects");
}
