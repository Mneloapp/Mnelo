import type { BoqItem } from "@/lib/data";

export type RequirementStatus = "Incomplete Specs" | "Needs Review" | "Ready for RFQ";

export type RequirementSourceRow = {
  id: string;
  description: string;
  quantity: number | null;
  unit: string | null;
  sheetName: string;
  rowNumber: number;
};

export type DerivedRequirement = {
  id: string;
  name: string;
  normalizedDescription: string;
  system: string;
  category: string;
  subcategory: string;
  totalQuantity: number | null;
  unit: string | null;
  sourceRows: RequirementSourceRow[];
  status: RequirementStatus;
  confidenceScore: number;
  classificationSource: BoqItem["classificationSource"];
  needsReview: boolean;
};

export type RequirementSection = {
  name: string;
  requirements: DerivedRequirement[];
};

export type RequirementInsights = {
  duplicateSourcesGrouped: number;
  needsReview: number;
  readyForRfq: number;
  requirementsFound: number;
};

const preferredSections = ["Lighting", "Containment", "Power", "Fire Alarm", "HVAC"] as const;
const needsReviewLabels = new Set(["", "General", "Needs Review", "Needs review", "Unclassified"]);

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function displayValue(value: string | null | undefined, fallback = "Unclassified") {
  const normalized = value?.trim();

  return normalized && !needsReviewLabels.has(normalized) ? normalized : fallback;
}

function getRequirementSectionName({
  category,
  subcategory,
  system,
}: {
  category: string | null | undefined;
  subcategory: string | null | undefined;
  system: string | null | undefined;
}) {
  const displayCategory = displayValue(category, "");
  const displaySubcategory = displayValue(subcategory, "");
  const displaySystem = displayValue(system, "");
  const haystack = `${displayCategory} ${displaySubcategory} ${displaySystem}`.toLowerCase();

  if (haystack.includes("lighting") || haystack.includes("exit sign")) {
    return "Lighting";
  }

  if (haystack.includes("containment") || haystack.includes("conduit") || haystack.includes("tray")) {
    return "Containment";
  }

  if (haystack.includes("power") || haystack.includes("panel") || haystack.includes("cable")) {
    return "Power";
  }

  if (haystack.includes("fire alarm")) {
    return "Fire Alarm";
  }

  if (displaySystem === "HVAC") {
    return "HVAC";
  }

  return "Other / Needs Review";
}

function getRequirementStatus(item: BoqItem): RequirementStatus {
  const hasCategory = displayValue(item.subcategory, "") !== "";
  const hasSubcategory = displayValue(item.classificationSubcategory, "") !== "";

  if (item.needsReview) {
    return "Needs Review";
  }

  if (!hasCategory || !hasSubcategory) {
    return "Incomplete Specs";
  }

  return "Ready for RFQ";
}

function getRequirementKey(item: BoqItem) {
  return [
    displayValue(item.category, "Needs Review"),
    displayValue(item.subcategory, "Needs Review"),
    displayValue(item.classificationSubcategory, "Needs Review"),
    normalizeText(item.description),
    item.unit?.trim().toLowerCase() || "unitless",
  ].join("|");
}

function compareRequirements(a: DerivedRequirement, b: DerivedRequirement) {
  if (a.status !== b.status) {
    return a.status === "Needs Review" ? -1 : b.status === "Needs Review" ? 1 : a.status.localeCompare(b.status);
  }

  return a.name.localeCompare(b.name);
}

export function deriveRequirementsFromBoqItems(items: BoqItem[]) {
  const requirementMap = new Map<string, DerivedRequirement>();

  for (const item of items) {
    if (item.rowType !== "item") {
      continue;
    }

    const key = getRequirementKey(item);
    const sourceRow = {
      id: item.id,
      description: item.description,
      quantity: item.quantity,
      rowNumber: item.sourceRowNumber || item.rowNumber,
      sheetName: item.sourceSheetName || item.sheetName,
      unit: item.unit,
    } satisfies RequirementSourceRow;
    const existing = requirementMap.get(key);

    if (existing) {
      existing.sourceRows.push(sourceRow);
      existing.confidenceScore = Math.max(existing.confidenceScore, item.confidenceScore);
      existing.needsReview = existing.needsReview || item.needsReview;
      existing.status = existing.needsReview ? "Needs Review" : existing.status;

      if (existing.unit && item.unit && existing.unit === item.unit && item.quantity !== null) {
        existing.totalQuantity = (existing.totalQuantity || 0) + item.quantity;
      }

      continue;
    }

    const status = getRequirementStatus(item);
    requirementMap.set(key, {
      category: displayValue(item.subcategory),
      classificationSource: item.classificationSource,
      confidenceScore: item.confidenceScore,
      id: key,
      name: item.description,
      needsReview: item.needsReview,
      normalizedDescription: normalizeText(item.description),
      sourceRows: [sourceRow],
      status,
      subcategory: displayValue(item.classificationSubcategory),
      system: displayValue(item.category, "Needs Review"),
      totalQuantity: item.quantity,
      unit: item.unit,
    });
  }

  const requirements = Array.from(requirementMap.values()).map((requirement) => ({
    ...requirement,
    sourceRows: requirement.sourceRows.sort((a, b) => a.sheetName.localeCompare(b.sheetName) || a.rowNumber - b.rowNumber),
  }));
  const sectionMap = new Map<string, DerivedRequirement[]>();

  for (const requirement of requirements) {
    const sectionName = getRequirementSectionName({
      category: requirement.category,
      subcategory: requirement.subcategory,
      system: requirement.system,
    });
    const section = sectionMap.get(sectionName) || [];
    section.push(requirement);
    sectionMap.set(sectionName, section);
  }

  const sections = [
    ...preferredSections.map((name) => ({ name, requirements: sectionMap.get(name) || [] })),
    { name: "Other / Needs Review", requirements: sectionMap.get("Other / Needs Review") || [] },
  ].filter((section) => section.requirements.length > 0);

  const insights = {
    duplicateSourcesGrouped: requirements.filter((requirement) => requirement.sourceRows.length > 1).length,
    needsReview: requirements.filter((requirement) => requirement.status === "Needs Review").length,
    readyForRfq: requirements.filter((requirement) => requirement.status === "Ready for RFQ").length,
    requirementsFound: requirements.length,
  } satisfies RequirementInsights;

  return {
    insights,
    requirements,
    sections: sections.map((section) => ({
      ...section,
      requirements: section.requirements.sort(compareRequirements),
    })),
  };
}
