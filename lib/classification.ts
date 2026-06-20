export type SystemClassification = {
  systemName: string;
  categoryName: string;
  supplierType: string;
  confidenceScore: number;
};

type SystemRule = {
  systemName: string;
  categoryName: string;
  supplierType: string;
  keywords: string[];
};

export const systemRules: SystemRule[] = [
  {
    systemName: "HVAC",
    categoryName: "Mechanical air systems",
    supplierType: "Mechanical contractor",
    keywords: ["ahu", "air handling", "duct", "diffuser", "fan coil", "hvac", "chiller", "ventilation", "grille"],
  },
  {
    systemName: "Fire Fighting",
    categoryName: "Fire protection",
    supplierType: "Fire protection contractor",
    keywords: ["fire fighting", "sprinkler", "hydrant", "fire pump", "fire alarm", "suppression", "extinguisher"],
  },
  {
    systemName: "Plumbing",
    categoryName: "Water and drainage",
    supplierType: "Plumbing contractor",
    keywords: ["pipe", "piping", "drainage", "sanitary", "water supply", "valve", "pump", "plumbing", "fixture"],
  },
  {
    systemName: "Electrical",
    categoryName: "Power and lighting",
    supplierType: "Electrical contractor",
    keywords: ["cable", "switchgear", "panel", "lighting", "conduit", "generator", "transformer", "electrical", "db"],
  },
  {
    systemName: "Low Current",
    categoryName: "Technology systems",
    supplierType: "Systems integrator",
    keywords: ["cctv", "data", "network", "access control", "low current", "security", "bms", "telecom", "structured cabling"],
  },
  {
    systemName: "Civil",
    categoryName: "Site works",
    supplierType: "Civil contractor",
    keywords: ["earthwork", "excavation", "backfill", "asphalt", "road", "paving", "site works", "manhole", "trench"],
  },
  {
    systemName: "Structural",
    categoryName: "Structure",
    supplierType: "Structural contractor",
    keywords: ["concrete", "rebar", "steel beam", "column", "slab", "foundation", "formwork", "structural", "steelwork"],
  },
  {
    systemName: "Finishes",
    categoryName: "Architectural finishes",
    supplierType: "Finishes contractor",
    keywords: ["tile", "paint", "ceiling", "flooring", "door", "window", "gypsum", "plaster", "cladding", "finish"],
  },
  {
    systemName: "Mechanical",
    categoryName: "Mechanical equipment",
    supplierType: "Mechanical supplier",
    keywords: ["compressor", "motor", "bearing", "mechanical", "gearbox", "shaft", "fan", "boiler"],
  },
  {
    systemName: "Industrial Equipment",
    categoryName: "Plant and machinery",
    supplierType: "Industrial equipment supplier",
    keywords: ["machine", "conveyor", "industrial", "tank", "vessel", "production line", "equipment", "loader"],
  },
  {
    systemName: "Medical Equipment",
    categoryName: "Clinical equipment",
    supplierType: "Medical equipment supplier",
    keywords: ["medical", "clinical", "patient", "scanner", "laboratory", "hospital", "surgical"],
  },
  {
    systemName: "Furniture",
    categoryName: "Fixtures and furnishings",
    supplierType: "Furniture supplier",
    keywords: ["desk", "chair", "table", "cabinet", "furniture", "workstation", "sofa", "shelving"],
  },
  {
    systemName: "Software",
    categoryName: "Digital systems",
    supplierType: "Software vendor",
    keywords: ["software", "license", "platform", "subscription", "integration", "api", "dashboard"],
  },
  {
    systemName: "Renewable Energy",
    categoryName: "Energy systems",
    supplierType: "Energy systems supplier",
    keywords: ["solar", "pv", "battery", "inverter", "renewable", "wind", "energy storage"],
  },
  {
    systemName: "Logistics",
    categoryName: "Freight and handling",
    supplierType: "Logistics provider",
    keywords: ["freight", "shipping", "delivery", "transport", "logistics", "warehouse", "customs"],
  },
  {
    systemName: "Office Supplies",
    categoryName: "Consumables",
    supplierType: "Office supplier",
    keywords: ["paper", "stationery", "printer", "toner", "office supplies", "folder"],
  },
];

const knownSystemNames = new Set(systemRules.map((rule) => rule.systemName.toLowerCase()));

export function getSystemRuleOptions() {
  return systemRules.map((rule) => ({
    categoryName: rule.categoryName,
    systemName: rule.systemName,
  }));
}

export function classifyBoqSystem(description: string, existingCategory?: string | null, existingSubcategory?: string | null) {
  const normalizedDescription = description.toLowerCase();
  const match = systemRules
    .map((rule) => ({
      ...rule,
      matches: rule.keywords.filter((keyword) => normalizedDescription.includes(keyword)).length,
    }))
    .sort((a, b) => b.matches - a.matches)[0];

  if (match?.matches) {
    return {
      categoryName: match.categoryName,
      confidenceScore: Math.min(0.96, 0.58 + match.matches * 0.12),
      supplierType: match.supplierType,
      systemName: match.systemName,
    } satisfies SystemClassification;
  }

  if (existingCategory && existingCategory !== "General" && knownSystemNames.has(existingCategory.toLowerCase())) {
    return {
      categoryName: existingSubcategory || "General scope",
      confidenceScore: 0.5,
      supplierType: "Specialist supplier",
      systemName: existingCategory,
    } satisfies SystemClassification;
  }

  return {
    categoryName: existingSubcategory && existingSubcategory !== "Unclassified" ? existingSubcategory : "Unclassified",
    confidenceScore: 0.35,
    supplierType: "General supplier",
    systemName: existingCategory && existingCategory !== "General" ? existingCategory : "General",
  } satisfies SystemClassification;
}

export function normalizeTakeoffUnit(unit?: string | null) {
  const normalized = String(unit || "").trim().toLowerCase();

  if (!normalized) {
    return "item";
  }

  const aliases = new Map([
    ["pcs", "item"],
    ["pc", "item"],
    ["no", "item"],
    ["nos", "item"],
    ["each", "item"],
    ["ea", "item"],
    ["m2", "m2"],
    ["sqm", "m2"],
    ["sq.m", "m2"],
    ["m3", "m3"],
    ["cum", "m3"],
    ["lm", "m"],
    ["meter", "m"],
    ["metre", "m"],
    ["kg", "kg"],
    ["ton", "ton"],
    ["tons", "ton"],
    ["lot", "lot"],
    ["set", "set"],
  ]);

  return aliases.get(normalized) || normalized;
}
