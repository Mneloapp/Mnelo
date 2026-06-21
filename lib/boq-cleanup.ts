export const boqRowTypes = ["item", "header", "subtotal", "total", "note", "ignored"] as const;

export type BoqRowType = (typeof boqRowTypes)[number];

export type BoqCleanupInput = {
  amount: number | null;
  description: string;
  quantity: number | null;
  rate: number | null;
  unit: string | null;
};

export type BoqCleanupResult = {
  reason: string;
  rowType: BoqRowType;
};

export const BOQ_MIN_ITEM_DESCRIPTION_LENGTH = 3;

function normalizeDescription(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ");
}

function hasLetters(value: string) {
  return /\p{L}/u.test(value);
}

function isOnlyNumbering(value: string) {
  const normalized = value.trim();

  return /^[\d\s.,\-–—()/]+$/.test(normalized);
}

function hasQuantityLikeValue(row: BoqCleanupInput) {
  return row.quantity !== null || row.rate !== null || row.amount !== null || Boolean(row.unit);
}

export function cleanupBoqRow(row: BoqCleanupInput): BoqCleanupResult {
  const description = row.description.trim();
  const normalized = normalizeDescription(description);
  const quantity = Number(row.quantity || 0);

  if (!description) {
    return { reason: "Empty description.", rowType: "ignored" };
  }

  if (isOnlyNumbering(description)) {
    return { reason: "Numbering or spreadsheet artifact.", rowType: "ignored" };
  }

  if (description.length < BOQ_MIN_ITEM_DESCRIPTION_LENGTH && !hasQuantityLikeValue(row)) {
    return { reason: "Description is shorter than the cleanup threshold.", rowType: "ignored" };
  }

  if (/^(page|გვერდი|страница|sayfa)\s*\d+/i.test(description)) {
    return { reason: "Page header/footer.", rowType: "ignored" };
  }

  if (/\b(grand total|total amount|overall total)\b/i.test(description) || /^(total|ჯამი|სულ|итого|всего|toplam)$/i.test(normalized)) {
    return { reason: "Total row.", rowType: "total" };
  }

  if (/\b(subtotal|sub total)\b/i.test(description) || /^(ქვეჯამი|промежуточный итог|ara toplam)$/i.test(normalized)) {
    return { reason: "Subtotal row.", rowType: "subtotal" };
  }

  if (/^(note|notes|შენიშვნა|примечание|not)\b/i.test(normalized)) {
    return { reason: "Note row.", rowType: "note" };
  }

  if (/^(section|chapter|part|group|раздел|глава|часть|bölüm)\b/i.test(normalized)) {
    return { reason: "Section header.", rowType: "header" };
  }

  if (!hasQuantityLikeValue(row) && description.length <= 24) {
    return { reason: "Likely section/header row without quantity data.", rowType: "header" };
  }

  if (quantity === 0 && !row.amount && !row.rate && !row.unit && description.length <= 40) {
    return { reason: "Likely section/header row with zero quantity.", rowType: "header" };
  }

  return { reason: "Looks like a procurement item.", rowType: "item" };
}

export function summarizeBoqCleanup(rows: Array<{ rowType: BoqRowType }>) {
  const parsedRows = rows.length;
  const itemRows = rows.filter((row) => row.rowType === "item").length;

  return {
    ignoredRows: parsedRows - itemRows,
    itemRows,
    parsedRows,
  };
}
