import Link from "next/link";
import { login } from "@/app/auth/actions";
import { Logo } from "@/components/ui";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string; next?: string }>;
}) {
  const { error, message, next } = await searchParams;

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-line bg-white p-6 shadow-soft">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-ink">Welcome back</h1>
          <p className="mt-2 text-sm text-ink/55">
            Sign in to continue estimating, validating, and procuring project scopes with Mnelo.
          </p>
        </div>

        {error ? (
          <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        ) : null}

        {message ? (
          <div className="mt-5 rounded-lg border border-leaf-200 bg-leaf-50 px-4 py-3 text-sm text-leaf-800">
            {message}
          </div>
        ) : null}

        <form action={login} className="mt-8 space-y-4">
          <input name="next" type="hidden" value={next ?? "/dashboard"} />
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
          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-ink/55">
              <input className="h-4 w-4 rounded border-line text-leaf-600 focus:ring-leaf-500" type="checkbox" />
              Remember me
            </label>
            <a className="font-medium text-leaf-700 hover:text-leaf-800" href="#">
              Reset password
            </a>
          </div>
          <button
            className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-ink px-4 text-sm font-semibold text-white shadow-soft transition hover:bg-leaf-900"
            type="submit"
          >
            Sign in
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink/55">
          New to Mnelo?{" "}
          <Link className="font-semibold text-leaf-700 hover:text-leaf-800" href="/signup">
            Create an account
          </Link>
        </p>
      </section>
    </main>
  );
}
