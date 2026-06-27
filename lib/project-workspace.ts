import type { BoqItem, ProjectFile } from "@/lib/data";

export function getParsedFileIds(boqItems: BoqItem[], files: ProjectFile[]) {
  const parsedFileIds = Array.from(
    new Set(boqItems.map((item) => item.sourceFileId).filter((fileId): fileId is string => Boolean(fileId))),
  );

  if (parsedFileIds.length === 0 && boqItems.length > 0 && files.length === 1) {
    parsedFileIds.push(files[0].id);
  }

  return parsedFileIds;
}
