import { Button, Logo } from "@/components/ui";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-line bg-white p-6 shadow-soft">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-ink">Welcome back</h1>
          <p className="mt-2 text-sm text-ink/55">
            Sign in to continue estimating, validating, and procuring MEP scopes with Mnelo.
          </p>
        </div>
        <form className="mt-8 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-ink/70">Email</span>
            <input
              className="mt-2 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none transition placeholder:text-ink/30 focus:border-leaf-400 focus:ring-4 focus:ring-leaf-100"
              placeholder="estimator@company.com"
              type="email"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-ink/70">Password</span>
            <input
              className="mt-2 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none transition placeholder:text-ink/30 focus:border-leaf-400 focus:ring-4 focus:ring-leaf-100"
              placeholder="••••••••"
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
          <Button href="/dashboard" className="w-full">
            Sign in
          </Button>
        </form>
      </section>
    </main>
  );
}
