"use client";

import { useRef } from "react";
import { deleteProjectFile } from "@/app/projects/actions";

export function DeleteFileButton({
  fileId,
  fileName,
  hasParsedBoq,
  projectId,
}: {
  fileId: string;
  fileName: string;
  hasParsedBoq: boolean;
  projectId: string;
}) {
  const confirmedInputRef = useRef<HTMLInputElement>(null);

  return (
    <form
      action={deleteProjectFile}
      onSubmit={(event) => {
        if (!hasParsedBoq) {
          return;
        }

        const confirmed = window.confirm("Delete file and all parsed BOQ data?");

        if (!confirmed) {
          event.preventDefault();
          return;
        }

        if (confirmedInputRef.current) {
          confirmedInputRef.current.value = "true";
        }
      }}
    >
      <input name="project_id" type="hidden" value={projectId} />
      <input name="file_id" type="hidden" value={fileId} />
      <input name="confirmed" ref={confirmedInputRef} type="hidden" defaultValue="false" />
      <button
        aria-label={`Delete ${fileName}`}
        className="inline-flex h-8 items-center justify-center rounded-md bg-white px-3 text-xs font-semibold text-red-700 ring-1 ring-red-200 transition hover:bg-red-50"
        type="submit"
      >
        Delete
      </button>
    </form>
  );
}
