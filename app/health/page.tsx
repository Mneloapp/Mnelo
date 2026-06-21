import { getBuildInfo } from "@/lib/build-info";
import { createSupabaseClient, hasSupabaseConfig, supabaseEnvStatus } from "@/lib/supabase";

export const dynamic = "force-dynamic";

async function checkSupabaseConnection() {
  const diagnostics = {
    isConnected: false,
    errorMessage: "",
  };

  if (!hasSupabaseConfig) {
    return {
      ...diagnostics,
      errorMessage: "Missing required Supabase environment variables.",
    };
  }

  try {
    const supabase = createSupabaseClient();
    const { error } = await supabase.auth.getSession();

    if (!error) {
      return {
        isConnected: true,
        errorMessage: "",
      };
    }

    return {
      ...diagnostics,
      errorMessage: error.message,
    };
  } catch (error) {
    return {
      ...diagnostics,
      errorMessage: error instanceof Error ? error.message : "Unknown Supabase connection error.",
    };
  }
}

export default async function HealthPage() {
  const { isConnected, errorMessage } = await checkSupabaseConnection();
  const buildInfo = getBuildInfo();
  const envRows = [
    ["NEXT_PUBLIC_SUPABASE_URL", supabaseEnvStatus.hasUrl],
    ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", supabaseEnvStatus.hasPublishableKey],
    ["NEXT_PUBLIC_SUPABASE_ANON_KEY", supabaseEnvStatus.hasAnonKey],
  ] satisfies Array<[string, boolean]>;

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <section className="w-full max-w-2xl rounded-2xl border border-line bg-white p-8 shadow-soft">
        <div
          className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${
            isConnected ? "bg-leaf-100 text-leaf-700" : "bg-red-50 text-red-700"
          }`}
          aria-hidden="true"
        >
          <span className="h-2.5 w-2.5 rounded-full bg-current" />
        </div>
        <h1 className="mt-5 text-center text-3xl font-semibold tracking-tight text-ink">
          {isConnected ? "Supabase Connected" : "Connection Failed"}
        </h1>
        <p className="mt-3 text-center text-sm leading-6 text-ink/58">
          Mnelo health check for the configured Supabase project.
        </p>

        <div className="mt-8 grid gap-3 text-sm">
          {envRows.map(([label, exists]) => (
            <div key={label} className="flex items-center justify-between rounded-lg bg-mist px-4 py-3">
              <span className="font-mono text-xs text-ink/65">{label}</span>
              <span className={`font-medium ${exists ? "text-leaf-700" : "text-red-700"}`}>
                {exists ? "Exists" : "Missing"}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between rounded-lg bg-mist px-4 py-3">
            <span className="font-mono text-xs text-ink/65">Key used</span>
            <span className="font-medium text-ink capitalize">{supabaseEnvStatus.keySource}</span>
          </div>
        </div>

        {!isConnected ? (
          <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-700">Supabase error</p>
            <p className="mt-2 break-words font-mono text-sm text-red-900">{errorMessage}</p>
          </div>
        ) : null}

        <div className="mt-5 rounded-lg border border-line bg-mist px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink/45">Build</p>
          <dl className="mt-2 grid gap-2 text-xs">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-ink/55">Commit</dt>
              <dd className="break-all font-mono text-ink">{buildInfo.commit}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-ink/55">Branch</dt>
              <dd className="font-mono text-ink">{buildInfo.branch}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-ink/55">Environment</dt>
              <dd className="font-mono text-ink">{buildInfo.environment}</dd>
            </div>
          </dl>
        </div>
      </section>
    </main>
  );
}
