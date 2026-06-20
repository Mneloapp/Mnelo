"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteProjectFile, uploadProjectDocument } from "@/app/projects/actions";
import type { ProjectDocumentActionResult } from "@/app/projects/actions";
import type { ProjectFile } from "@/lib/data";

type Notice = {
  tone: "success" | "error";
  message: string;
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
  const [isUploading, setIsUploading] = useState(false);
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
            const ok = await handleResult(result, "File uploaded successfully.");

            if (ok) {
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
            className="mt-2 block h-11 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-ink file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-leaf-900 disabled:cursor-not-allowed disabled:opacity-55"
            disabled={isUploading}
            name="file"
            required
            type="file"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-ink/70">Document type</span>
          <select
            className="mt-2 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none transition focus:border-leaf-400 focus:ring-4 focus:ring-leaf-100 disabled:cursor-not-allowed disabled:opacity-55"
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
            className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-ink px-4 text-sm font-semibold text-white shadow-soft transition hover:bg-leaf-900 disabled:cursor-not-allowed disabled:opacity-60 lg:w-auto"
            disabled={isUploading}
            type="submit"
          >
            {isUploading ? "Uploading..." : "Upload"}
          </button>
        </div>
      </form>

      <div className="mt-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/45">Uploaded files</h3>
        {visibleFiles.length > 0 ? (
          <div className="mt-3 overflow-hidden rounded-xl border border-line">
            <div className="divide-y divide-line">
              {visibleFiles.map((file) => {
                const hasParsedBoq = parsedFileIds.includes(file.id);
                const isDeleting = deletingFileId === file.id;

                return (
                  <div
                    className="grid gap-3 bg-white px-4 py-3 text-sm md:grid-cols-[1fr_10rem_7rem_9rem_auto]"
                    key={file.id}
                  >
                    <div>
                      <p className="font-medium text-ink">{file.fileName}</p>
                      <p className="mt-1 font-mono text-xs text-ink/40">{file.storagePath}</p>
                    </div>
                    <p className="text-ink/65">{file.documentType}</p>
                    <p className="text-ink/65">{file.fileSize}</p>
                    <p className="text-ink/55">{file.uploadedAt}</p>
                    <div className="flex items-start justify-start md:justify-end">
                      <button
                        aria-label={`Delete ${file.fileName}`}
                        className="inline-flex h-8 items-center justify-center rounded-md bg-white px-3 text-xs font-semibold text-red-700 ring-1 ring-red-200 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
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
