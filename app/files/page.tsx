import Link from "next/link";
import { FolderKanban } from "lucide-react";
import { FilesTable } from "@/components/files-table";
import { ErrorMessage, PageHeader } from "@/components/ui";
import { WorkspaceShell } from "@/components/workspace-shell";
import { getFilesForCurrentUser } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function FilesPage() {
  const { files, errorMessage } = await getFilesForCurrentUser();
  const showError = process.env.NODE_ENV === "development" && errorMessage;

  return (
    <WorkspaceShell active="Files">
      <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <PageHeader
          action={
            <Link
              className="inline-flex h-11 items-center justify-center rounded-xl bg-[#16a34a] px-5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(22,163,74,0.24)] transition hover:bg-[#087a36]"
              href="/projects"
            >
              <FolderKanban aria-hidden="true" className="mr-2 h-4 w-4" strokeWidth={2} />
              Choose Project
            </Link>
          }
          subtitle="Review uploaded documents across every project and manage parsing or deletion from one place."
          title="Files"
        />

        {showError ? (
          <div className="mt-5">
            <ErrorMessage message={errorMessage} />
          </div>
        ) : null}

        <section className="mt-8">
          <FilesTable files={files} />
        </section>
      </div>
    </WorkspaceShell>
  );
}
