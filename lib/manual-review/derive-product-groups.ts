import type { BoqItem } from "@/lib/data";
import type { ProductGroup } from "@/components/manual-review/types";

const weakIdentityTokens = new Set([
  "accessories",
  "and",
  "complete",
  "equipment",
  "for",
  "including",
  "item",
  "set",
  "system",
  "unit",
  "with",
  "აქსესუარებით",
  "ერთეული",
  "კომპლექტი",
  "მოწყობილობა",
  "სისტემა",
]);

export function deriveProductGroups(items: BoqItem[]) {
  const groups = new Map<string, ProductGroup>();

  for (const item of items) {
    if (item.rowType !== "item") {
      continue;
    }

    const classification = getDisplayClassification(item);
    const technicalMarkers = extractTechnicalMarkers(item.description);
    const normalizedIdentity = getNormalizedProductIdentity(item.description);
    const unit = item.unit?.trim() || null;
    const groupKey = [
      classification.system,
      classification.category,
      classification.subcategory || "Unclassified",
      normalizedIdentity || item.id,
      unit || "no-unit",
      technicalMarkers.join("|"),
    ].join("::");

    const existing = groups.get(groupKey);
    if (existing) {
      existing.rows.push(item);
      existing.totalQuantity = sumQuantity(existing.totalQuantity, item.quantity);
      existing.averageConfidence = getAverageConfidence(existing.rows);
      existing.status = getGroupStatus(existing.rows, existing.averageConfidence);
      continue;
    }

    groups.set(groupKey, {
      averageConfidence: item.confidenceScore || 0,
      category: classification.category,
      id: groupKey,
      name: getGroupName(item, normalizedIdentity),
      normalizedIdentity,
      rows: [item],
      status: getGroupStatus([item], item.confidenceScore || 0),
      subcategory: classification.subcategory,
      system: classification.system,
      technicalMarkers,
      totalQuantity: item.quantity,
      unit,
      whyGrouped: getWhyGrouped({ technicalMarkers, unit }),
    });
  }

  return Array.from(groups.values()).sort((a, b) => {
    const statusRank = getStatusRank(a.status) - getStatusRank(b.status);
    if (statusRank !== 0) return statusRank;
    return b.rows.length - a.rows.length;
  });
}

function getDisplayClassification(item: BoqItem) {
  return {
    category: item.subcategory || "Unclassified",
    subcategory: item.classificationSubcategory || item.inheritedSubcategory || item.sectionHeader || null,
    system: item.category || "Needs Review",
  };
}

function getGroupName(item: BoqItem, normalizedIdentity: string) {
  const section = item.classificationSubcategory || item.inheritedSubcategory || item.sectionHeader;
  if (section && section !== "Needs review") {
    return section;
  }

  if (normalizedIdentity) {
    return titleCase(normalizedIdentity).slice(0, 72);
  }

  return item.description.slice(0, 72) || "Untitled requirement group";
}

function getNormalizedProductIdentity(description: string) {
  const normalized = normalizeDescription(description);
  const tokens = normalized
    .split(" ")
    .filter((token) => token.length > 1 && !weakIdentityTokens.has(token))
    .slice(0, 14);

  return tokens.join(" ");
}

function normalizeDescription(value: string) {
  return value
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}\s./°Øø-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTechnicalMarkers(description: string) {
  const markers = new Set<string>();
  const upper = description.toUpperCase();
  const patterns = [
    /\b\d+(?:[.,]\d+)?\s?(?:KW|W|V|KV|A|KVA|VA|HZ|MM|CM|M)\b/g,
    /\bIP\s?\d{2}\b/g,
    /[Øø]\s?\d+(?:[.,]\d+)?/g,
    /\b\d+\s?[Xx×]\s?\d+(?:\s?[Xx×]\s?\d+)?\b/g,
    /\b\d{3,5}\s?K\b/g,
    /\b[A-Z]{1,8}[-/]\d+[A-Z0-9/-]*\b/g,
  ];

  for (const pattern of patterns) {
    for (const match of upper.matchAll(pattern)) {
      markers.add(match[0].replace(/\s+/g, ""));
    }
  }

  return Array.from(markers).sort();
}

function getWhyGrouped({ technicalMarkers, unit }: { technicalMarkers: string[]; unit: string | null }) {
  const reasons = ["Same normalized product identity", "Same classification family"];
  if (unit) reasons.push("Same unit");
  if (technicalMarkers.length > 0) reasons.push("Same technical markers");
  return reasons;
}

function sumQuantity(current: number | null, next: number | null) {
  if (current === null && next === null) return null;
  return (current || 0) + (next || 0);
}

function getAverageConfidence(rows: BoqItem[]) {
  if (rows.length === 0) return 0;
  return rows.reduce((total, row) => total + (row.confidenceScore || 0), 0) / rows.length;
}

function getGroupStatus(rows: BoqItem[], confidence: number) {
  if (rows.some((row) => row.needsReview)) return "Needs Review";
  if (rows.every((row) => row.classificationSource === "learned" || row.classificationSource === "user")) return "Learned";
  if (confidence < 0.75) return "Low Confidence";
  return "Ready";
}

function getStatusRank(status: ProductGroup["status"]) {
  return { "Needs Review": 0, "Low Confidence": 1, Learned: 2, Ready: 3 }[status];
}

function titleCase(value: string) {
  return value.replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase());
}
