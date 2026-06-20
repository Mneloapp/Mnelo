import { AppNav } from "@/components/app-nav";
import { Badge, Button } from "@/components/ui";

const features = [
  "BOQ and tender intake",
  "Estimate workspace",
  "Supplier-ready procurement packs",
  "Risk and scope intelligence",
];

export default function LandingPage() {
  return (
    <main className="relative overflow-hidden">
      <div className="grid-surface absolute inset-x-0 top-0 h-[42rem]" />
      <header className="relative mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <AppNav className="mb-0" />
      </header>

      <section className="relative mx-auto grid min-h-[calc(100vh-5rem)] max-w-7xl items-center gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_0.9fr] lg:px-8">
        <div>
          <Badge>AI Workspace for Estimation & Procurement</Badge>
          <h1 className="mt-7 max-w-4xl text-5xl font-semibold tracking-tight text-ink sm:text-6xl lg:text-7xl">
            Mnelo turns project inputs into priced procurement decisions.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-ink/62">
            A premium workspace for estimation and procurement teams: upload BOQs, tenders, drawings,
            and specifications, then turn scope into supplier-ready packages with AI assistance.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button href="/dashboard">View dashboard</Button>
            <Button href="/projects" variant="secondary">
              Explore projects
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-white/85 p-3 shadow-glow backdrop-blur">
          <div className="rounded-xl border border-line bg-ink p-4 text-white">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <p className="text-sm text-white/50">Live estimate</p>
                <p className="text-xl font-semibold">Regional Expansion Package</p>
              </div>
              <span className="rounded-full bg-leaf-400/15 px-3 py-1 text-xs font-medium text-leaf-200">
                94% confidence
              </span>
            </div>
            <div className="grid gap-3 py-4 sm:grid-cols-3">
              {[
                ["148", "Documents parsed"],
                ["1,842", "BOQ line items"],
                ["$4.8M", "Estimated value"],
              ].map(([value, label]) => (
                <div key={label} className="rounded-lg bg-white/[0.06] p-4">
                  <p className="text-2xl font-semibold">{value}</p>
                  <p className="mt-1 text-xs text-white/45">{label}</p>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              {features.map((feature, index) => (
                <div key={feature} className="flex items-center justify-between rounded-lg bg-white/[0.04] px-4 py-3">
                  <span className="text-sm text-white/78">{feature}</span>
                  <span className="font-mono text-xs text-leaf-200">0{index + 1}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="platform" className="mx-auto grid max-w-7xl gap-4 px-4 pb-20 sm:px-6 md:grid-cols-3 lg:px-8">
        {[
          ["Estimate", "AI agents classify line items, detect scope gaps, and generate structured quantities."],
          ["Validate", "Confidence scoring keeps estimators in control before numbers reach procurement."],
          ["Procure", "Turn approved BOQs into vendor packages, alternates, and quote comparisons."],
        ].map(([title, copy]) => (
          <div key={title} className="rounded-xl border border-line bg-white p-6 shadow-sm">
            <p className="text-lg font-semibold tracking-tight text-ink">{title}</p>
            <p className="mt-3 text-sm leading-6 text-ink/58">{copy}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
