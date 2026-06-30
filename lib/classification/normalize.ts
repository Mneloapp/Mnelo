export function normalizeClassificationText(value?: string | number | null) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const normalizeClassificationMemoryDescription = normalizeClassificationText;

export function sanitizeClassificationLabel(value?: null | string) {
  const trimmed = value?.replace(/\s+/g, " ").trim();

  if (!trimmed) {
    return null;
  }

  const withoutLeadingNumber = trimmed
    .replace(/^[№#]?\s*\d+(?:[.)/-]\d+)*\s*[-.)/:]?\s+/u, "")
    .replace(/^\d+(?:\s+\d+)+\s*[-.)/:]?\s*/u, "")
    .trim();
  const normalized = withoutLeadingNumber || trimmed;
  const normalizedLower = normalized.toLowerCase();

  if (["general", "unclassified", "needs review", "needs_review"].includes(normalizedLower)) {
    return null;
  }

  if (!/\p{L}/u.test(normalized)) {
    return null;
  }

  return normalized;
}
