export type ClassificationMemoryRecord = {
  category: string | null;
  confidenceScore?: number | null;
  normalizedDescription: string | null;
  originalDescription?: string | null;
  source?: string | null;
  subcategory: string | null;
  system: string | null;
};

export type ClassificationMemoryMatch = {
  category: string;
  confidenceScore: number;
  normalizedDescription: string;
  originalDescription: string;
  source: "learned";
  subcategory: string;
  system: string;
};

export function normalizeClassificationMemoryDescription(value?: string | number | null) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isCompleteMemoryRecord(record: ClassificationMemoryRecord): record is ClassificationMemoryRecord & {
  category: string;
  subcategory: string;
  system: string;
} {
  return Boolean(record.system && record.category && record.subcategory);
}

export function findClassificationMemoryMatch(
  description: string,
  records: ClassificationMemoryRecord[],
): ClassificationMemoryMatch | null {
  const normalizedDescription = normalizeClassificationMemoryDescription(description);

  if (!normalizedDescription) {
    return null;
  }

  const exactMatches = records.filter(isCompleteMemoryRecord).filter(
    (record) =>
      normalizeClassificationMemoryDescription(record.normalizedDescription || record.originalDescription) === normalizedDescription,
  );

  if (exactMatches.length === 0) {
    return null;
  }

  const selected = exactMatches.sort((a, b) => Number(b.confidenceScore || 0) - Number(a.confidenceScore || 0))[0];
  const category = selected.category;
  const subcategory = selected.subcategory;
  const system = selected.system;

  return {
    category,
    confidenceScore: Number(selected.confidenceScore || 1),
    normalizedDescription,
    originalDescription: selected.originalDescription || description,
    source: "learned",
    subcategory,
    system,
  };
}
