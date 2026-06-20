import Link from "next/link";
import { FileSpreadsheet, FolderKanban } from "lucide-react";
import { EmptyState, ErrorMessage, PageHeader } from "@/components/ui";
import { WorkspaceShell } from "@/components/workspace-shell";
import { getBoqItemsAcrossCurrentUser } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function BoqPage() {
  const { items, errorMessage } = await getBoqItemsAcrossCurrentUser();
  const showError = process.env.NODE_ENV === "development" && errorMessage;

  return (
    <WorkspaceShell active="BOQ">
      <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <PageHeader
          action={
            <Link
              className="inline-flex h-11 items-center justify-center rounded-xl bg-[#16a34a] px-5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(22,163,74,0.24)] transition hover:bg-[#087a36]"
              href="/projects"
            >
              <FolderKanban aria-hidden="true" className="mr-2 h-4 w-4" strokeWidth={2} />
              Open Projects
            </Link>
          }
          subtitle="Browse parsed BOQ rows across projects, including quantities, units, rates, amounts, and source files."
          title="BOQ"
        />

        {showError ? (
          <div className="mt-5">
            <ErrorMessage message={errorMessage} />
          </div>
        ) : null}

        <section className="mt-8">
          {items.length > 0 ? (
            <div className="overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white shadow-[0_18px_50px_rgba(15,23,42,0.04)]">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-[#fbfdfb] text-xs uppercase tracking-[0.12em] text-[#64748b]">
                    <tr>
                      <th className="px-5 py-4 font-semibold">Description</th>
                      <th className="px-5 py-4 font-semibold">Project</th>
                      <th className="px-5 py-4 text-right font-semibold">Quantity</th>
                      <th className="px-5 py-4 font-semibold">Unit</th>
                      <th className="px-5 py-4 text-right font-semibold">Rate</th>
                      <th className="px-5 py-4 text-right font-semibold">Amount</th>
                      <th className="px-5 py-4 font-semibold">Source file</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#edf0ed]">
                    {items.map((item) => (
                      <tr className="transition hover:bg-[#f8faf8]" key={item.id}>
                        <td className="min-w-96 px-5 py-4 font-medium text-[#0f172a]">{item.description}</td>
                        <td className="whitespace-nowrap px-5 py-4">
                          <Link className="font-medium text-[#087a36]" href={`/projects/${item.projectId}#boq`}>
                            {item.projectName}
                          </Link>
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-right text-[#64748b]">
                          {item.quantity === null ? "—" : item.quantity.toLocaleString()}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-[#64748b]">{item.unit || "—"}</td>
                        <td className="whitespace-nowrap px-5 py-4 text-right text-[#64748b]">
                          {item.rate === null ? "—" : item.rate.toLocaleString()}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-right text-[#64748b]">
                          {item.amount === null ? "—" : item.amount.toLocaleString()}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-[#64748b]">{item.sourceFileName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <EmptyState
              action={
                <Link
                  className="inline-flex h-10 items-center justify-center rounded-xl bg-[#16a34a] px-4 text-sm font-semibold text-white"
                  href="/projects"
                >
                  <FileSpreadsheet aria-hidden="true" className="mr-2 h-4 w-4" strokeWidth={2} />
                  Upload BOQ File
                </Link>
              }
              description="Upload or parse a BOQ file inside a project to get started."
              title="No BOQ items parsed yet"
            />
          )}
        </section>
      </div>
    </WorkspaceShell>
  );
}
