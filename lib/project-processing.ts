import type { ProjectFile } from "@/lib/data";

export type ProcessingStatus = "queued" | "processing" | "completed" | "needs_review" | "failed";

export type ProcessingStage =
  | "uploaded"
  | "queued"
  | "reading"
  | "classifying"
  | "extracting"
  | "reviewing"
  | "completed"
  | "failed";

export type ProjectProcessingItem = {
  id: string;
  confidence: number | null;
  documentType: string;
  errorMessage: string | null;
  fileName: string;
  stage: ProcessingStage;
  status: ProcessingStatus;
  timestamp: string;
};

export function getProcessingStageLabel(stage: ProcessingStage) {
  const labels: Record<ProcessingStage, string> = {
    classifying: "Classifying",
    completed: "Completed",
    extracting: "Extracting",
    failed: "Failed",
    queued: "Queued",
    reading: "Reading",
    reviewing: "Reviewing",
    uploaded: "Uploaded",
  };

  return labels[stage];
}

export function getProcessingStatusLabel(status: ProcessingStatus) {
  const labels: Record<ProcessingStatus, string> = {
    completed: "Completed",
    failed: "Failed",
    needs_review: "Needs review",
    processing: "Processing",
    queued: "Queued",
  };

  return labels[status];
}

export function deriveProjectProcessingItems({
  files,
  parsedFileIds,
}: {
  files: ProjectFile[];
  parsedFileIds: string[];
}): ProjectProcessingItem[] {
  const parsedIds = new Set(parsedFileIds);

  return files.map((file) => {
    const isExcelBoq = ["xlsx", "xls"].includes(file.fileType.toLowerCase());
    const isParsed = parsedIds.has(file.id);

    return {
      confidence: isParsed ? 0.9 : null,
      documentType: file.documentType,
      errorMessage: null,
      fileName: file.fileName,
      id: file.id,
      stage: isParsed ? "completed" : isExcelBoq ? "queued" : "uploaded",
      status: isParsed ? "completed" : "queued",
      timestamp: file.uploadedAt,
    } satisfies ProjectProcessingItem;
  });
}
