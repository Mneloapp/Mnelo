"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileSpreadsheet, RefreshCw, Trash2 } from "lucide-react";
import {
  deleteProjectFile,
  parseExistingProjectFile,
  saveBoqColumnMappingAndParse,
} from "@/app/projects/actions";
import type { ProjectDocumentActionResult } from "@/app/projects/actions";
import type { GlobalProjectFile } from "@/lib/data";
import { ParserDebugSummary } from "@/components/parser-debug-summary";
import { EmptyState, ErrorMessage } from "@/components/ui";

type MappingRequest = {
  columns: NonNullable<ProjectDocumentActionResult["mappingColumns"]>;
  projectFileId: string;
  projectId: string;
};

export function FilesTable({ files }: { files: GlobalProjectFile[] }) {
  const router = useRouter();
  const [visibleFiles, setVisibleFiles] = useState(files);
  const [notice, setNotice] = useState<{
    tone: "success" | "error";
    message: string;
    parserSummary?: ProjectDocumentActionResult["parserSummary"];
  } | null>(null);
  const [mappingRequest, setMappingRequest] = useState<MappingRequest | null>(null);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
  const [parsingFileId, setParsingFileId] = useState<string | null>(null);
  const [isSavingMapping, setIsSavingMapping] = useState(false);

  async function handleResult(result: ProjectDocumentActionResult, successFallback: string) {
    if (!result.ok) {
      const message = result.error || "Unknown action error.";
      console.error(message);
      setNotice({ tone: "error", message });
      return false;
    }

    setNotice({ tone: "success", message: result.message || successFallback, parserSummary: result.parserSummary });
    router.refresh();
    return true;
  }

  return (
    <>
      {notice ? (
        <div className="mb-4">
          {notice.tone === "error" ? (
            <ErrorMessage message={notice.message} />
          ) : (
            <div className="rounded-xl border border-[#bbf7d0] bg-[#ecfdf3] px-4 py-3 text-sm text-[#087a36]">
              <div>{notice.message}</div>
              <ParserDebugSummary summary={notice.parserSummary} />
            </div>
          )}
        </div>
      ) : null}

      {mappingRequest ? (
        <form
          className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-5"
          onSubmit={async (event) => {
            event.preventDefault();

            if (isSavingMapping) {
              return;
            }

            setIsSavingMapping(true);
            setNotice(null);

            try {
              const formData = new FormData(event.currentTarget);
              const result = await saveBoqColumnMappingAndParse(formData);
              const ok = await handleResult(result, "Column mapping saved and BOQ parsed.");

              if (ok) {
                setMappingRequest(null);
              }
            } catch (error) {
              console.error(error);
              setNotice({
                tone: "error",
                message: error instanceof Error ? error.message : "Unknown mapping error.",
              });
            } finally {
              setIsSavingMapping(false);
            }
          }}
        >
          <input name="project_id" type="hidden" value={mappingRequest.projectId} />
          <input name="project_file_id" type="hidden" value={mappingRequest.projectFileId} />
          <h3 className="text-sm font-semibold text-[#0f172a]">Map BOQ columns</h3>
          <p className="mt-1 text-sm text-[#64748b]">
            Detection confidence was low. Select the matching columns and Mnelo will reuse them for this project.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-5">
            {[
              ["Description", "description_column", true],
              ["Qty", "quantity_column", false],
              ["Unit", "unit_column", false],
              ["Rate", "rate_column", false],
              ["Amount", "amount_column", false],
            ].map(([label, name, required]) => (
              <label className="block" key={String(name)}>
                <span className="text-xs font-semibold uppercase tracking-wide text-[#64748b]">{label}</span>
                <select
                  className="mt-2 h-10 w-full rounded-xl border border-amber-200 bg-white px-3 text-sm outline-none transition focus:border-[#16a34a] focus:ring-4 focus:ring-[#dcfce7] disabled:cursor-not-allowed disabled:opacity-55"
                  disabled={isSavingMapping}
                  name={String(name)}
                  required={Boolean(required)}
                >
                  {!required ? <option value="">Not used</option> : null}
                  {mappingRequest.columns.map((column) => (
                    <option key={`${name}-${column.value}`} value={column.value}>
                      {column.label}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              className="inline-flex h-10 items-center justify-center rounded-xl bg-[#16a34a] px-4 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(22,163,74,0.18)] transition hover:bg-[#087a36] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSavingMapping}
              type="submit"
            >
              {isSavingMapping ? "Saving mapping..." : "Save mapping and parse"}
            </button>
            <button
              className="inline-flex h-10 items-center justify-center rounded-xl bg-white px-4 text-sm font-semibold text-[#0f172a] ring-1 ring-amber-200 transition hover:bg-amber-100"
              disabled={isSavingMapping}
              onClick={() => setMappingRequest(null)}
              type="button"
            >
              Dismiss
            </button>
          </div>
        </form>
      ) : null}

      {visibleFiles.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white shadow-[0_18px_50px_rgba(15,23,42,0.04)]">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#fbfdfb] text-xs uppercase tracking-[0.12em] text-[#64748b]">
                <tr>
                  <th className="px-5 py-4 font-semibold">File name</th>
                  <th className="px-5 py-4 font-semibold">Project</th>
                  <th className="px-5 py-4 font-semibold">Size</th>
                  <th className="px-5 py-4 font-semibold">Uploaded</th>
                  <th className="px-5 py-4 font-semibold">Parse status</th>
                  <th className="px-5 py-4 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf0ed]">
                {visibleFiles.map((file) => {
                  const canParse = ["xlsx", "xls"].includes(file.fileType.toLowerCase());
                  const isDeleting = deletingFileId === file.id;
                  const isParsing = parsingFileId === file.id;

                  return (
                    <tr className="transition hover:bg-[#f8faf8]" key={file.id}>
                      <td className="min-w-72 px-5 py-4">
                        <p className="font-semibold text-[#0f172a]">{file.fileName}</p>
                        <p className="mt-1 text-xs text-[#64748b]">{file.documentType}</p>
                      </td>
                      <td className="px-5 py-4">
                        <Link className="font-medium text-[#087a36]" href={`/projects/${file.projectId}`}>
                          {file.projectName}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-[#64748b]">{file.fileSize}</td>
                      <td className="whitespace-nowrap px-5 py-4 text-[#64748b]">{file.uploadedAt}</td>
                      <td className={file.hasParsedBoq ? "px-5 py-4 font-medium text-[#087a36]" : "px-5 py-4 text-[#64748b]"}>
                        {file.hasParsedBoq ? "Parsed" : canParse ? "Not parsed" : "Not applicable"}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          {canParse ? (
                            <button
                              className="inline-flex h-9 items-center justify-center rounded-xl bg-white px-3 text-xs font-semibold text-[#087a36] ring-1 ring-[#bbf7d0] transition hover:bg-[#ecfdf3] disabled:cursor-not-allowed disabled:opacity-60"
                              disabled={Boolean(parsingFileId || deletingFileId)}
                              onClick={async () => {
                                setParsingFileId(file.id);
                                setNotice(null);

                                try {
                                  const formData = new FormData();
                                  formData.set("project_id", file.projectId);
                                  formData.set("project_file_id", file.id);

                                  const result = await parseExistingProjectFile(formData);

                                  if (!result.ok && result.needsMapping && result.projectFileId && result.mappingColumns) {
                                    setMappingRequest({
                                      columns: result.mappingColumns,
                                      projectFileId: result.projectFileId,
                                      projectId: file.projectId,
                                    });
                                    setNotice({
                                      tone: "error",
                                      message:
                                        result.error ||
                                        "Column detection confidence is low. Select BOQ columns manually.",
                                    });
                                    return;
                                  }

                                  const ok = await handleResult(result, "BOQ parsed successfully.");

                                  if (ok) {
                                    setVisibleFiles((currentFiles) =>
                                      currentFiles.map((currentFile) =>
                                        currentFile.id === file.id ? { ...currentFile, hasParsedBoq: true } : currentFile,
                                      ),
                                    );
                                  }
                                } catch (error) {
                                  console.error(error);
                                  setNotice({
                                    tone: "error",
                                    message: error instanceof Error ? error.message : "Unknown parse error.",
                                  });
                                } finally {
                                  setParsingFileId(null);
                                }
                              }}
                              type="button"
                            >
                              {file.hasParsedBoq ? (
                                <RefreshCw aria-hidden="true" className="mr-2 h-4 w-4" strokeWidth={2} />
                              ) : (
                                <FileSpreadsheet aria-hidden="true" className="mr-2 h-4 w-4" strokeWidth={2} />
                              )}
                              {isParsing ? "Parsing..." : file.hasParsedBoq ? "Re-parse" : "Parse"}
                            </button>
                          ) : null}
                          <button
                            className="inline-flex h-9 items-center justify-center rounded-xl bg-white px-3 text-xs font-semibold text-red-700 ring-1 ring-red-200 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={Boolean(deletingFileId)}
                            onClick={async () => {
                              if (file.hasParsedBoq && !window.confirm("Delete file and all parsed BOQ data?")) {
                                return;
                              }

                              setDeletingFileId(file.id);
                              setNotice(null);

                              try {
                                const formData = new FormData();
                                formData.set("project_id", file.projectId);
                                formData.set("file_id", file.id);

                                const result = await deleteProjectFile(formData);
                                const ok = await handleResult(result, "File deleted successfully.");

                                if (ok) {
                                  setVisibleFiles((currentFiles) =>
                                    currentFiles.filter((currentFile) => currentFile.id !== file.id),
                                  );
                                }
                              } catch (error) {
                                console.error(error);
                                setNotice({
                                  tone: "error",
                                  message: error instanceof Error ? error.message : "Unknown delete error.",
                                });
                              } finally {
                                setDeletingFileId(null);
                              }
                            }}
                            type="button"
                          >
                            <Trash2 aria-hidden="true" className="mr-2 h-4 w-4" strokeWidth={2} />
                            {isDeleting ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState
          description="Upload documents inside a project and they will appear here across your workspace."
          title="No files uploaded yet"
        />
      )}
    </>
  );
}
