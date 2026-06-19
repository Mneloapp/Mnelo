import { createSupabaseClient, hasSupabaseConfig } from "@/lib/supabase";

export const dynamic = "force-dynamic";

async function checkSupabaseConnection() {
  if (!hasSupabaseConfig) {
    return false;
  }

  try {
    const supabase = createSupabaseClient();
    const { error } = await supabase.from("_mnelo_health_check").select("*").limit(1);

    return !error || error.code === "42P01";
  } catch {
    return false;
  }
}

export default async function HealthPage() {
  const isConnected = await checkSupabaseConnection();

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-line bg-white p-8 text-center shadow-soft">
        <div
          className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${
            isConnected ? "bg-leaf-100 text-leaf-700" : "bg-red-50 text-red-700"
          }`}
          aria-hidden="true"
        >
          <span className="h-2.5 w-2.5 rounded-full bg-current" />
        </div>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight text-ink">
          {isConnected ? "Supabase Connected" : "Connection Failed"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-ink/58">
          Mnelo health check for the configured Supabase project.
        </p>
      </section>
    </main>
  );
}
