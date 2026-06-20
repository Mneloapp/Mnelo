import Link from "next/link";
import { ArrowRight, FileText, FolderKanban, Play, TableProperties } from "lucide-react";
import { AppNav } from "@/components/app-nav";

const previewRows = [
  ["Warehouse fit-out", "Documents organized", "Draft"],
  ["Healthcare package", "BOQ parsed", "Review"],
  ["Renewable energy site", "Quotes ready", "Active"],
];

const featureCards = [
  {
    icon: FileText,
    title: "Organize tender inputs",
    copy: "Keep BOQs, drawings, specifications and project notes connected to the right workspace.",
  },
  {
    icon: TableProperties,
    title: "Parse BOQ detail",
    copy: "Turn uploaded spreadsheets into structured rows your team can review, map and manage.",
  },
  {
    icon: FolderKanban,
    title: "Move procurement forward",
    copy: "Prepare cleaner project packages for supplier outreach, quote comparison and cost decisions.",
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f8faf8] text-[#0f172a]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[34rem] bg-[radial-gradient(circle_at_top_left,rgba(22,163,74,0.16),transparent_32rem)]" />

      <header className="relative mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <AppNav className="mb-0" />
      </header>

      <section className="relative mx-auto grid min-h-[calc(100vh-5rem)] max-w-7xl items-center gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_0.95fr] lg:px-8">
        <div>
          <span className="inline-flex items-center rounded-full bg-[#ecfdf3] px-3 py-1 text-xs font-semibold text-[#087a36] ring-1 ring-[#bbf7d0]">
            Built for estimators, procurement teams and contractors
          </span>
          <h1 className="mt-7 max-w-4xl text-5xl font-semibold tracking-tight text-[#0f172a] sm:text-6xl lg:text-7xl">
            Build Estimates.
            <br />
            Manage Procurement.
            <br />
            Deliver More.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[#64748b]">
            Upload BOQs, organize documents, compare supplier quotes and manage project costs in one connected
            workspace.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              className="inline-flex h-11 items-center justify-center rounded-xl bg-[#16a34a] px-5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(22,163,74,0.24)] transition hover:bg-[#087a36]"
              href="/signup"
            >
              Start Free
              <ArrowRight aria-hidden="true" className="ml-2 h-4 w-4" strokeWidth={2} />
            </Link>
            <Link
              className="inline-flex h-11 items-center justify-center rounded-xl bg-white px-5 text-sm font-semibold text-[#0f172a] ring-1 ring-[#e5e7eb] transition hover:bg-[#f8faf8]"
              href="#demo"
            >
              <Play aria-hidden="true" className="mr-2 h-4 w-4" strokeWidth={2} />
              Watch Demo
            </Link>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-[#e5e7eb] bg-white p-4 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <div className="rounded-2xl border border-[#e5e7eb] bg-[#fbfdfb] p-5">
            <div className="flex flex-col gap-4 border-b border-[#e5e7eb] pb-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-[#64748b]">Workspace preview</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight text-[#0f172a]">Project control center</p>
              </div>
              <span className="rounded-full bg-[#ecfdf3] px-3 py-1 text-xs font-semibold text-[#087a36]">
                Connected
              </span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {[
                ["Projects", "Active workspaces"],
                ["Files", "Tender documents"],
                ["BOQ", "Parsed line items"],
              ].map(([label, detail]) => (
                <div className="rounded-2xl border border-[#e5e7eb] bg-white p-4" key={label}>
                  <p className="text-sm font-semibold text-[#0f172a]">{label}</p>
                  <p className="mt-2 text-xs leading-5 text-[#64748b]">{detail}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white">
              <div className="grid grid-cols-[1fr_9rem_6rem] gap-3 bg-[#fbfdfb] px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#64748b]">
                <span>Project</span>
                <span>Status</span>
                <span>Stage</span>
              </div>
              <div className="divide-y divide-[#edf0ed]">
                {previewRows.map(([project, status, stage]) => (
                  <div className="grid grid-cols-[1fr_9rem_6rem] gap-3 px-4 py-4 text-sm" key={project}>
                    <span className="font-semibold text-[#0f172a]">{project}</span>
                    <span className="text-[#64748b]">{status}</span>
                    <span className="text-[#087a36]">{stage}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        className="relative mx-auto grid max-w-7xl gap-4 px-4 pb-20 sm:px-6 md:grid-cols-3 lg:px-8"
        id="demo"
      >
        {featureCards.map(({ copy, icon: Icon, title }) => (
          <div
            className="rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.04)]"
            key={title}
          >
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#ecfdf3] text-[#16a34a]">
              <Icon aria-hidden="true" className="h-6 w-6" strokeWidth={2} />
            </div>
            <p className="mt-5 text-lg font-semibold tracking-tight text-[#0f172a]">{title}</p>
            <p className="mt-3 text-sm leading-6 text-[#64748b]">{copy}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
