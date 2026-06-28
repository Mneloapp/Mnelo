export function normalizeClassificationText(value?: string | number | null) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const normalizeClassificationMemoryDescription = normalizeClassificationText;
