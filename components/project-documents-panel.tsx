"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileSpreadsheet, RefreshCw, Trash2, UploadCloud } from "lucide-react";
import {
  deleteProjectFile,
  parseExistingProjectFile,
  saveBoqColumnMappingAndParse,
  uploadProjectDocument,
} from "@/app/projects/actions";
import type { ProjectDocumentActionResult } from "@/app/projects/actions";
import type { ProjectFile } from "@/lib/data";

type Notice = {
  tone: "success" | "error";
  message: string;
};

type MappingRequest = {
  columns: NonNullable<ProjectDocumentActionResult["mappingColumns"]>;
  projectFileId: string;
};

export function ProjectDocumentsPanel({
  files,
  initialError,
  initialMessage,
  parsedFileIds,
  projectId,
}: {
  files: ProjectFile[];
  initialError?: string;
  initialMessage?: string;
  parsedFileIds: string[];
  projectId: string;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [visibleFiles, setVisibleFiles] = useState(files);
  const [notice, setNotice] = useState<Notice | null>(
    initialError
      ? { tone: "error", message: initialError }
      : initialMessage
        ? { tone: "success", message: initialMessage }
        : null,
  );
  const [mappingRequest, setMappingRequest] = useState<MappingRequest | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSavingMapping, setIsSavingMapping] = useState(false);
  const [parsingFileId, setParsingFileId] = useState<string | null>(null);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);

  useEffect(() => {
    setVisibleFiles(files);
  }, [files]);

  async function handleResult(result: ProjectDocumentActionResult, successFallback: string) {
    if (!result.ok) {
      const message = result.error || "Unknown action error.";
      console.error(message);
      setNotice({ tone: "error", message });
      return false;
    }

    setNotice({ tone: "success", message: result.message || successFallback });
    router.refresh();
    return true;
  }

  return (
    <>
      {notice ? (
        <div
          className={
            notice.tone === "success"
              ? "mt-5 rounded-lg border border-leaf-200 bg-leaf-50 px-4 py-3 text-sm text-leaf-800"
              : "mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          }
          role="status"
        >
          {notice.message}
        </div>
      ) : null}

      <form
        className="mt-5 grid gap-4 lg:grid-cols-[1fr_14rem_auto]"
        encType="multipart/form-data"
        onSubmit={async (event) => {
          event.preventDefault();

          if (isUploading) {
            return;
          }

          setIsUploading(true);
          setNotice(null);

          try {
            const formData = new FormData(event.currentTarget);
            const result = await uploadProjectDocument(formData);

            if (!result.ok && result.needsMapping && result.projectFileId && result.mappingColumns) {
              setMappingRequest({
                columns: result.mappingColumns,
                projectFileId: result.projectFileId,
              });
              setNotice({
                tone: "error",
                message: result.error || "Column detection confidence is low. Select BOQ columns manually.",
              });
              return;
            }

            const ok = await handleResult(result, "File uploaded successfully.");

            if (ok) {
              setMappingRequest(null);
              formRef.current?.reset();
            }
          } catch (error) {
            console.error(error);
            setNotice({
              tone: "error",
              message: error instanceof Error ? error.message : "Unknown upload error.",
            });
          } finally {
            setIsUploading(false);
          }
        }}
        ref={formRef}
      >
        <input name="project_id" type="hidden" value={projectId} />
        <label className="block">
          <span className="text-sm font-medium text-ink/70">Document file</span>
          <input
            accept=".xlsx,.xls,.pdf"
            className="mt-2 block h-11 w-full rounded-xl border border-[#e5e7eb] bg-white px-3 py-2 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-[#ecfdf3] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[#087a36] hover:file:bg-[#dcfce7] disabled:cursor-not-allowed disabled:opacity-55"
            disabled={isUploading}
            name="file"
            required
            type="file"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-ink/70">Document type</span>
          <select
            className="mt-2 h-11 w-full rounded-xl border border-[#e5e7eb] bg-white px-3 text-sm outline-none transition focus:border-[#16a34a] focus:ring-4 focus:ring-[#dcfce7] disabled:cursor-not-allowed disabled:opacity-55"
            disabled={isUploading}
            name="document_type"
          >
            <option>BOQ Excel</option>
            <option>Specification PDF</option>
            <option>Drawing PDF</option>
            <option>Other</option>
          </select>
        </label>
        <div className="flex items-end">
          <button
            className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#16a34a] px-4 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(22,163,74,0.22)] transition hover:bg-[#087a36] disabled:cursor-not-allowed disabled:opacity-60 lg:w-auto"
            disabled={isUploading}
            type="submit"
          >
            <UploadCloud aria-hidden="true" className="mr-2 h-4 w-4" strokeWidth={2} />
            {isUploading ? "Uploading..." : "Upload"}
          </button>
        </div>
      </form>

      {mappingRequest ? (
        <form
          className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4"
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
                formRef.current?.reset();
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
          <input name="project_id" type="hidden" value={projectId} />
          <input name="project_file_id" type="hidden" value={mappingRequest.projectFileId} />
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-semibold text-ink">Map BOQ columns</h3>
            <p className="text-sm text-ink/60">
              Detection confidence was low. Choose the matching columns once; Mnelo will reuse this mapping for future uploads in this project.
            </p>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-5">
            {[
              ["Description", "description_column", true],
              ["Qty", "quantity_column", false],
              ["Unit", "unit_column", false],
              ["Rate", "rate_column", false],
              ["Amount", "amount_column", false],
            ].map(([label, name, required]) => (
              <label className="block" key={String(name)}>
                <span className="text-xs font-semibold uppercase tracking-wide text-ink/55">{label}</span>
                <select
                  className="mt-2 h-10 w-full rounded-lg border border-amber-200 bg-white px-2 text-sm outline-none transition focus:border-leaf-400 focus:ring-4 focus:ring-leaf-100 disabled:cursor-not-allowed disabled:opacity-55"
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
              className="inline-flex h-10 items-center justify-center rounded-xl bg-white px-4 text-sm font-semibold text-ink ring-1 ring-amber-200 transition hover:bg-amber-100"
              disabled={isSavingMapping}
              onClick={() => setMappingRequest(null)}
              type="button"
            >
              Dismiss
            </button>
          </div>
        </form>
      ) : null}

      <div className="mt-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/45">Uploaded files</h3>
        {visibleFiles.length > 0 ? (
          <div className="mt-3 overflow-hidden rounded-xl border border-line">
            <div className="hidden grid-cols-[1fr_9rem_9rem_14rem] gap-3 border-b border-line bg-mist/60 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink/45 md:grid">
              <span>File name</span>
              <span>Upload date</span>
              <span>Parse status</span>
              <span className="text-right">Actions</span>
            </div>
            <div className="divide-y divide-line">
              {visibleFiles.map((file) => {
                const hasParsedBoq = parsedFileIds.includes(file.id);
                const isDeleting = deletingFileId === file.id;
                const isParsing = parsingFileId === file.id;
                const canParse = ["xlsx", "xls"].includes(file.fileType.toLowerCase());

                return (
                  <div
                    className="grid gap-3 bg-white px-4 py-3 text-sm md:grid-cols-[1fr_9rem_9rem_14rem]"
                    key={file.id}
                  >
                    <div>
                      <p className="font-medium text-ink">{file.fileName}</p>
                      <p className="mt-1 text-xs text-ink/45">
                        {file.documentType} / {file.fileSize}
                      </p>
                    </div>
                    <p className="text-ink/55">{file.uploadedAt}</p>
                    <p className={hasParsedBoq ? "font-medium text-leaf-700" : "text-ink/45"}>
                      {hasParsedBoq ? "Parsed" : canParse ? "Not parsed" : "Not applicable"}
                    </p>
                    <div className="flex flex-wrap items-start justify-start gap-2 md:justify-end">
                      {canParse ? (
                        <button
                          className="inline-flex h-8 items-center justify-center rounded-lg bg-white px-3 text-xs font-semibold text-[#087a36] ring-1 ring-[#bbf7d0] transition hover:bg-[#ecfdf3] disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={Boolean(deletingFileId || parsingFileId)}
                          onClick={async () => {
                            setParsingFileId(file.id);
                            setNotice(null);

                            try {
                              const formData = new FormData();
                              formData.set("project_id", projectId);
                              formData.set("project_file_id", file.id);

                              const result = await parseExistingProjectFile(formData);

                              if (!result.ok && result.needsMapping && result.projectFileId && result.mappingColumns) {
                                setMappingRequest({
                                  columns: result.mappingColumns,
                                  projectFileId: result.projectFileId,
                                });
                                setNotice({
                                  tone: "error",
                                  message:
                                    result.error ||
                                    "Column detection confidence is low. Select BOQ columns manually.",
                                });
                                return;
                              }

                              await handleResult(result, "BOQ parsed successfully.");
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
                          {hasParsedBoq ? (
                            <RefreshCw aria-hidden="true" className="mr-2 h-3.5 w-3.5" strokeWidth={2} />
                          ) : (
                            <FileSpreadsheet aria-hidden="true" className="mr-2 h-3.5 w-3.5" strokeWidth={2} />
                          )}
                          {isParsing ? "Parsing..." : hasParsedBoq ? "Re-parse" : "Parse"}
                        </button>
                      ) : null}
                      <button
                        aria-label={`Delete ${file.fileName}`}
                        className="inline-flex h-8 items-center justify-center rounded-lg bg-white px-3 text-xs font-semibold text-red-700 ring-1 ring-red-200 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={Boolean(deletingFileId)}
                        onClick={async () => {
                          if (hasParsedBoq && !window.confirm("Delete file and all parsed BOQ data?")) {
                            return;
                          }

                          setDeletingFileId(file.id);
                          setNotice(null);

                          try {
                            const formData = new FormData();
                            formData.set("project_id", projectId);
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
                        <Trash2 aria-hidden="true" className="mr-2 h-3.5 w-3.5" strokeWidth={2} />
                        {isDeleting ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="mt-3 rounded-xl border border-dashed border-line bg-mist/50 p-6 text-center">
            <p className="font-medium text-ink">No documents uploaded yet</p>
            <p className="mt-2 text-sm text-ink/55">
              Upload BOQ Excel files, specification PDFs, or drawing PDFs to start organizing project inputs.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
