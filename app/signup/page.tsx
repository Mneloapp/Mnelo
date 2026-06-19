import Link from "next/link";
import { signup } from "@/app/auth/actions";
import { Logo } from "@/components/ui";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-line bg-white p-6 shadow-soft">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-ink">Create your account</h1>
          <p className="mt-2 text-sm text-ink/55">
            Start your Mnelo workspace for AI-assisted MEP estimation and procurement.
          </p>
        </div>

        {error ? (
          <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        ) : null}

        <form action={signup} className="mt-8 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-ink/70">Email</span>
            <input
              className="mt-2 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none transition placeholder:text-ink/30 focus:border-leaf-400 focus:ring-4 focus:ring-leaf-100"
              name="email"
              placeholder="estimator@company.com"
              required
              type="email"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-ink/70">Password</span>
            <input
              className="mt-2 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none transition placeholder:text-ink/30 focus:border-leaf-400 focus:ring-4 focus:ring-leaf-100"
              minLength={6}
              name="password"
              placeholder="••••••••"
              required
              type="password"
            />
          </label>
          <button
            className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-ink px-4 text-sm font-semibold text-white shadow-soft transition hover:bg-leaf-900"
            type="submit"
          >
            Create account
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink/55">
          Already have an account?{" "}
          <Link className="font-semibold text-leaf-700 hover:text-leaf-800" href="/login">
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
