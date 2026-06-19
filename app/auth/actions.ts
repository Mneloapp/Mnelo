"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function redirectWithError(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

export async function login(formData: FormData) {
  const email = getString(formData, "email");
  const password = getString(formData, "password");
  const next = getString(formData, "next") || "/dashboard";

  if (!email || !password) {
    redirectWithError("/login", "Email and password are required.");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirectWithError("/login", error.message);
  }

  redirect(next.startsWith("/") ? next : "/dashboard");
}

export async function signup(formData: FormData) {
  const email = getString(formData, "email");
  const password = getString(formData, "password");

  if (!email || !password) {
    redirectWithError("/signup", "Email and password are required.");
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    redirectWithError("/signup", error.message);
  }

  if (data.session) {
    redirect("/dashboard");
  }

  redirect("/login?message=Account%20created.%20Sign%20in%20to%20continue.");
}

export async function logout() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
