export type ClassificationSource = "ai" | "learned" | "needs_review" | "rules";

export type SystemClassification = {
  systemName: string;
  categoryName: string;
  subcategoryName?: string | null;
  supplierType: string;
  confidenceScore: number;
  reason?: string | null;
  source?: ClassificationSource;
};

export type TaxonomyCategory = {
  name: string;
  subcategories: string[];
};

export type TaxonomySystem = {
  name: string;
  supplierType: string;
  aliases?: string[];
  categories: TaxonomyCategory[];
};

type SystemRule = {
  systemName: string;
  categoryName: string;
  subcategoryName: string;
  supplierType: string;
  keywords: string[];
  strongKeywords: string[];
};

export const NEEDS_REVIEW_CATEGORY = "Needs review";
export const NEEDS_REVIEW_SUBCATEGORY = "Needs review";
export const NEEDS_REVIEW_SYSTEM = "Needs Review";
export const classificationSources = ["rules", "learned", "ai", "needs_review"] as const;

const taxonomy = [
  {
    name: "HVAC",
    supplierType: "HVAC contractor",
    aliases: ["ventilation", "air conditioning", "კონდიც", "ვენტილ", "вентиля", "кондиц"],
    categories: [
      {
        name: "Air Distribution",
        subcategories: [
          "Ductwork",
          "Rectangular Ducts",
          "Spiral Ducts",
          "Flexible Ducts",
          "Duct Fittings",
          "Duct Accessories",
          "Grilles",
          "Diffusers",
          "Louvers",
          "Air Terminals",
          "Fire Dampers",
          "Smoke Dampers",
          "Volume Control Dampers",
          "VAV Boxes",
          "CAV Boxes",
        ],
      },
      {
        name: "Fans",
        subcategories: ["Jet Fans", "Axial Fans", "Centrifugal Fans", "Exhaust Fans", "Supply Fans"],
      },
      {
        name: "HVAC Equipment",
        subcategories: [
          "Fan Coil Units",
          "AHU",
          "Heat Recovery Units",
          "VRF Indoor Units",
          "VRF Outdoor Units",
          "DX Units",
          "Chillers",
          "Cooling Towers",
        ],
      },
      {
        name: "Hydronic & Refrigerant Piping",
        subcategories: ["Chilled Water Pipes", "Refrigerant Pipes", "HVAC Valves", "HVAC Pumps"],
      },
      {
        name: "Insulation",
        subcategories: ["Pipe Insulation", "Duct Insulation"],
      },
      {
        name: "Controls & Commissioning",
        subcategories: ["HVAC Controls", "Thermostats", "Sensors", "Testing & Balancing"],
      },
    ],
  },
  {
    name: "Electrical",
    supplierType: "Electrical contractor",
    aliases: ["electrical", "ელექტრო", "электр", "power", "lighting"],
    categories: [
      {
        name: "Lighting",
        subcategories: ["Lighting Fixtures", "Emergency Lighting", "Exit Signs", "Lighting Control"],
      },
      {
        name: "Small Power",
        subcategories: ["Small Power", "Sockets", "Switches"],
      },
      {
        name: "Panels & Distribution",
        subcategories: [
          "Distribution Boards",
          "Main Distribution Boards",
          "Sub Distribution Boards",
          "MCC Panels",
          "Control Panels",
        ],
      },
      {
        name: "Containment",
        subcategories: ["Cable Trays", "Cable Ladders", "Cable Trunking", "Conduits", "Flexible Conduits"],
      },
      {
        name: "Cables & Termination",
        subcategories: ["Power Cables", "Control Cables", "Fire Resistant Cables", "Cable Glands", "Cable Termination"],
      },
      {
        name: "Earthing & Protection",
        subcategories: ["Earthing", "Lightning Protection"],
      },
      {
        name: "Power Equipment",
        subcategories: ["Generators", "ATS", "UPS", "Capacitor Banks", "Busbars", "Transformers"],
      },
      {
        name: "Testing",
        subcategories: ["Testing & Commissioning"],
      },
    ],
  },
  {
    name: "Low Current",
    supplierType: "Systems integrator",
    aliases: ["ELV", "low current", "structured cabling", "სუსტი დენი", "слаботоч"],
    categories: [
      {
        name: "Fire Alarm",
        subcategories: [
          "Fire Alarm",
          "Fire Alarm Control Panel",
          "Smoke Detectors",
          "Heat Detectors",
          "Manual Call Points",
          "Sounders",
          "Beacons",
          "Fire Alarm Modules",
        ],
      },
      {
        name: "Public Address",
        subcategories: ["Public Address", "Speakers", "Amplifiers", "Microphones"],
      },
      {
        name: "CCTV",
        subcategories: ["CCTV", "CCTV Cameras", "NVR", "Video Management System"],
      },
      {
        name: "Access Control",
        subcategories: ["Access Control", "Card Readers", "Door Controllers", "Magnetic Locks", "Electric Strikes"],
      },
      {
        name: "Communication",
        subcategories: ["Door Phone", "Intercom"],
      },
      {
        name: "Network & Structured Cabling",
        subcategories: [
          "Network Cabling",
          "Data Outlets",
          "Patch Panels",
          "Racks",
          "Switches",
          "Routers",
          "Wi-Fi Access Points",
          "Fiber Optic",
          "Structured Cabling",
        ],
      },
      {
        name: "Automation & Special Systems",
        subcategories: [
          "BMS",
          "Sensors",
          "Controllers",
          "Nurse Call",
          "SMATV",
          "IPTV",
          "Clock System",
          "Parking Management",
          "Barrier Gates",
        ],
      },
    ],
  },
  {
    name: "Plumbing",
    supplierType: "Plumbing contractor",
    aliases: ["plumbing", "water supply", "drainage", "სანტექნ", "კანალიზ", "водоснаб", "канализ"],
    categories: [
      {
        name: "Water Supply Piping",
        subcategories: ["Water Supply Pipes", "Hot Water Pipes", "Cold Water Pipes", "PPR Pipes", "PEX Pipes", "HDPE Pipes", "Steel Pipes"],
      },
      {
        name: "Drainage",
        subcategories: ["Drainage Pipes", "Soil Pipes", "Waste Pipes", "Vent Pipes", "Stormwater Pipes", "Floor Drains", "Roof Drains", "Cleanouts"],
      },
      {
        name: "Valves",
        subcategories: ["Valves", "PRV", "Check Valves", "Gate Valves", "Ball Valves"],
      },
      {
        name: "Pumps & Tanks",
        subcategories: ["Pumps", "Booster Pumps", "Transfer Pumps", "Circulation Pumps", "Water Tanks", "Water Heaters", "Calorifiers"],
      },
      {
        name: "Sanitary Fixtures",
        subcategories: ["Sanitary Fixtures", "WC", "Wash Basins", "Sinks", "Mixers", "Showers", "Accessories"],
      },
      {
        name: "Insulation & Testing",
        subcategories: ["Pipe Insulation", "Testing & Flushing"],
      },
    ],
  },
  {
    name: "Fire Fighting",
    supplierType: "Fire protection contractor",
    aliases: ["fire fighting", "fire protection", "sprinkler", "სახანძრო", "пожар"],
    categories: [
      {
        name: "Fire Piping",
        subcategories: ["Sprinkler Pipes", "Sprinkler Heads", "Fire Pipe Supports"],
      },
      {
        name: "Fire Cabinets & Hydrants",
        subcategories: ["Fire Cabinets", "Fire Hose Reels", "Fire Hydrants", "Landing Valves"],
      },
      {
        name: "Fire Pumps",
        subcategories: ["Fire Pumps", "Jockey Pumps", "Diesel Fire Pumps", "Electric Fire Pumps", "Fire Water Tanks"],
      },
      {
        name: "Fire Valves & Devices",
        subcategories: [
          "Fire Valves",
          "Alarm Check Valves",
          "Zone Control Valves",
          "Butterfly Valves",
          "Gate Valves",
          "Flow Switches",
          "Pressure Switches",
        ],
      },
      {
        name: "Suppression Systems",
        subcategories: ["Fire Extinguishers", "FM200", "Clean Agent", "Foam System", "Deluge System", "Pre-Action System"],
      },
      {
        name: "Testing",
        subcategories: ["Hydrotest", "Flushing", "Testing & Commissioning"],
      },
    ],
  },
  {
    name: "Civil",
    supplierType: "Civil contractor",
    aliases: ["civil", "earthwork", "site works", "გრუნტ", "землян"],
    categories: [
      {
        name: "Earthworks",
        subcategories: ["Excavation", "Backfilling", "Compaction", "Site Preparation"],
      },
      {
        name: "Concrete & Masonry",
        subcategories: ["Concrete", "Blinding Concrete", "Reinforced Concrete", "Screed", "Masonry", "Blockwork", "Plastering"],
      },
      {
        name: "Waterproofing & Insulation",
        subcategories: ["Waterproofing", "Bituminous Waterproofing", "Membrane Waterproofing", "Thermal Insulation"],
      },
      {
        name: "Civil Finishes",
        subcategories: ["Tiling", "Flooring", "Painting"],
      },
      {
        name: "External Works",
        subcategories: ["External Works", "Roads", "Kerbs", "Landscaping", "Drainage Channels", "Manholes", "Covers"],
      },
      {
        name: "Demolition",
        subcategories: ["Demolition"],
      },
    ],
  },
  {
    name: "Structural",
    supplierType: "Structural contractor",
    aliases: ["structural", "structure", "rebar", "steel structure", "ბეტონ", "არმატურ", "бетон", "арматур"],
    categories: [
      {
        name: "Concrete Structure",
        subcategories: ["Rebar", "Formwork", "Concrete Works", "Grouting", "Load Testing"],
      },
      {
        name: "Steel Structure",
        subcategories: [
          "Steel Structure",
          "Steel Beams",
          "Steel Columns",
          "Steel Connections",
          "Base Plates",
          "Anchor Bolts",
          "Metal Decking",
          "Welding",
          "Bolts & Fasteners",
          "Fireproofing",
          "Steel Painting",
        ],
      },
      {
        name: "Repairs",
        subcategories: ["Structural Repairs"],
      },
    ],
  },
  {
    name: "Finishes",
    supplierType: "Finishes contractor",
    aliases: ["finishes", "architectural", "fit-out", "კაფელ", "ჭერი", "плитка", "потолок"],
    categories: [
      {
        name: "Floor Finishes",
        subcategories: ["Floor Finishes", "Ceramic Tiles", "Porcelain Tiles", "Vinyl Flooring", "Epoxy Flooring", "Raised Floor", "Carpet"],
      },
      {
        name: "Wall & Ceiling Finishes",
        subcategories: ["Wall Finishes", "Gypsum Board", "Partitions", "Suspended Ceilings", "Acoustic Ceilings", "Painting"],
      },
      {
        name: "Doors & Windows",
        subcategories: ["Doors", "Fire Rated Doors", "Aluminum Doors", "Wooden Doors", "Windows", "Aluminum Windows", "Glazing"],
      },
      {
        name: "Architectural Metal & Joinery",
        subcategories: ["Facade", "Handrails", "Skirting", "Joinery", "Signage", "Toilet Partitions", "Accessories"],
      },
    ],
  },
  {
    name: "Equipment",
    supplierType: "Equipment supplier",
    aliases: ["equipment", "machinery", "დანადგარ", "оборудован"],
    categories: [
      {
        name: "Rotating Equipment",
        subcategories: ["Pumps", "Motors", "Fans", "Compressors"],
      },
      {
        name: "Process Equipment",
        subcategories: ["Tanks", "Heat Exchangers", "Boilers", "Generators", "Industrial Equipment", "Special Equipment"],
      },
      {
        name: "Vertical Transportation",
        subcategories: ["Lifts", "Escalators"],
      },
      {
        name: "Specialist Equipment",
        subcategories: ["Kitchen Equipment", "Laundry Equipment", "Medical Equipment"],
      },
    ],
  },
  {
    name: "General",
    supplierType: "General contractor",
    aliases: ["preliminaries", "general", "mobilization", "temporary works"],
    categories: [
      {
        name: "Preliminaries",
        subcategories: [
          "Mobilization",
          "Demobilization",
          "Shop Drawings",
          "As-Built Drawings",
          "Method Statements",
          "Testing & Commissioning",
          "Training",
          "Operation & Maintenance Manuals",
          "Temporary Works",
          "Scaffolding",
          "Site Offices",
          "Safety",
          "Supervision",
          "Transportation",
          "Permits",
          "Insurance",
          "Contingency",
        ],
      },
    ],
  },
] satisfies TaxonomySystem[];

const extraKeywordAliases = new Map<string, string[]>([
  ["AHU", ["air handling unit", "ahu"]],
  ["Fan Coil Units", ["fcu", "fan coil"]],
  ["VRF Indoor Units", ["vrf indoor"]],
  ["VRF Outdoor Units", ["vrf outdoor"]],
  ["DX Units", ["dx unit", "split unit"]],
  ["Power Cables", ["cable", "კაბელ", "кабель"]],
  ["Lighting Fixtures", ["luminaire", "light fixture", "სანათი", "светильник"]],
  ["Distribution Boards", ["distribution board", "db", "panel board", "გამანაწილებელი", "щит"]],
  ["Conduits", ["conduit", "pvc pipe electrical", "ელექტრო მილი"]],
  ["Sockets", ["socket", "outlet", "როზეტი", "розетка"]],
  ["Switches", ["switch", "ჩამრთველი", "выключатель"]],
  ["Fire Alarm", ["fire alarm", "სახანძრო სიგნალიზაცია", "пожарная сигнализация"]],
  ["CCTV Cameras", ["camera", "cctv camera", "კამერა", "камера"]],
  ["Network Cabling", ["utp", "data cable", "lan cable", "ქსელი"]],
  ["Water Supply Pipes", ["water pipe", "წყლის მილი", "водопроводная труба"]],
  ["Drainage Pipes", ["drain pipe", "sewer pipe", "საკანალიზაციო", "канализационная труба"]],
  ["WC", ["toilet", "water closet", "უნიტაზი", "унитаз"]],
  ["Wash Basins", ["basin", "lavatory", "ხელსაბანი", "раковина"]],
  ["Sprinkler Heads", ["sprinkler head", "спринклер", "სპრინკლერი"]],
  ["Fire Cabinets", ["fire cabinet", "hose cabinet", "სახანძრო კარადა"]],
  ["Excavation", ["excavation", "trench", "გათხრა", "земляные работы"]],
  ["Rebar", ["rebar", "reinforcement", "არმატურა", "арматура"]],
  ["Formwork", ["formwork", "ყალიბი", "опалубка"]],
  ["Ceramic Tiles", ["ceramic tile", "კერამიკული ფილა", "плитка"]],
  ["Gypsum Board", ["gypsum board", "drywall", "თაბაშირი", "гипсокартон"]],
]);

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s./&-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function wordsFromName(value: string) {
  return normalizeText(value)
    .split(/\s+/)
    .filter((token) => token.length > 1);
}

export const classificationTaxonomy = taxonomy;

export const systemRules: SystemRule[] = taxonomy.flatMap((system) =>
  system.categories.flatMap((category) =>
    category.subcategories.map((subcategory) => ({
      categoryName: category.name,
      keywords: [...wordsFromName(subcategory), subcategory, ...(extraKeywordAliases.get(subcategory) || [])],
      strongKeywords: [subcategory, ...(system.aliases || [])],
      subcategoryName: subcategory,
      supplierType: system.supplierType,
      systemName: system.name,
    })),
  ),
);

const taxonomyBySystem = new Map(taxonomy.map((system) => [system.name, system]));
const knownSystemNames = new Set([...taxonomy.map((system) => system.name.toLowerCase()), NEEDS_REVIEW_SYSTEM.toLowerCase()]);

function tokenize(value: string) {
  return normalizeText(value)
    .split(/\s+/)
    .filter((token) => token.length > 1);
}

function scoreRule(description: string, rule: SystemRule) {
  const normalizedDescription = normalizeText(description);
  const tokens = tokenize(description);
  let score = 0;
  let matches = 0;

  for (const keyword of rule.strongKeywords) {
    const normalizedKeyword = normalizeText(keyword);

    if (normalizedKeyword && normalizedDescription.includes(normalizedKeyword)) {
      score += 4;
      matches += 1;
    }
  }

  for (const keyword of rule.keywords) {
    const normalizedKeyword = normalizeText(keyword);

    if (!normalizedKeyword) {
      continue;
    }

    if (normalizedDescription.includes(normalizedKeyword)) {
      score += normalizedKeyword.length > 4 ? 3 : 1.5;
      matches += 1;
      continue;
    }

    const keywordTokens = tokenize(normalizedKeyword);
    const tokenHits = keywordTokens.filter((keywordToken) =>
      tokens.some((token) => token.includes(keywordToken) || keywordToken.includes(token)),
    ).length;

    if (tokenHits > 0 && keywordTokens.length > 0) {
      score += tokenHits / keywordTokens.length;
      matches += tokenHits / keywordTokens.length;
    }
  }

  return { matches, score };
}

export function getSystemRuleOptions() {
  return [
    ...taxonomy.map((system) => ({
      categoryName: system.categories[0]?.name || "General",
      subcategoryName: system.categories[0]?.subcategories[0] || null,
      systemName: system.name,
    })),
    {
      categoryName: NEEDS_REVIEW_CATEGORY,
      subcategoryName: NEEDS_REVIEW_SUBCATEGORY,
      systemName: NEEDS_REVIEW_SYSTEM,
    },
  ];
}

export function getCategoryOptions(system: string) {
  if (system === NEEDS_REVIEW_SYSTEM) {
    return [NEEDS_REVIEW_CATEGORY];
  }

  return taxonomyBySystem.get(system)?.categories.map((category) => category.name) || [];
}

export function getSubcategoryOptions(system: string, category?: string | null) {
  if (system === NEEDS_REVIEW_SYSTEM) {
    return [NEEDS_REVIEW_SUBCATEGORY];
  }

  const systemConfig = taxonomyBySystem.get(system);

  if (!systemConfig) {
    return [];
  }

  const categories = category ? systemConfig.categories.filter((candidate) => candidate.name === category) : systemConfig.categories;

  return categories.flatMap((candidate) => candidate.subcategories);
}

export function isValidSystem(system: string | null | undefined) {
  return Boolean(system && (system === NEEDS_REVIEW_SYSTEM || taxonomyBySystem.has(system)));
}

export function isValidCategory(system: string | null | undefined, category: string | null | undefined) {
  if (!system || !category) {
    return false;
  }

  return getCategoryOptions(system).includes(category);
}

export function isValidSubcategory(system: string | null | undefined, category: string | null | undefined, subcategory: string | null | undefined) {
  if (!system || !subcategory) {
    return false;
  }

  return getSubcategoryOptions(system, category).includes(subcategory);
}

export function getDefaultCategory(system: string) {
  return getCategoryOptions(system)[0] || NEEDS_REVIEW_CATEGORY;
}

export function getDefaultSubcategory(system: string, category?: string | null) {
  return getSubcategoryOptions(system, category)[0] || NEEDS_REVIEW_SUBCATEGORY;
}

function supplierTypeForSystem(systemName: string) {
  return taxonomyBySystem.get(systemName)?.supplierType || "Specialist supplier";
}

export function classifyBoqSystem(
  description: string,
  existingCategory?: string | null,
  existingSubcategory?: string | null,
  existingClassificationSubcategory?: string | null,
) {
  const match = systemRules
    .map((rule) => ({
      ...rule,
      ...scoreRule(description, rule),
    }))
    .sort((a, b) => b.score - a.score)[0];

  if (match && match.score >= 3) {
    return {
      categoryName: match.categoryName,
      confidenceScore: Math.min(0.97, 0.42 + match.score * 0.07),
      subcategoryName: match.subcategoryName,
      supplierType: match.supplierType,
      systemName: match.systemName,
    } satisfies SystemClassification;
  }

  if (existingCategory && existingCategory !== "General" && knownSystemNames.has(existingCategory.toLowerCase())) {
    const categoryName =
      existingSubcategory && isValidCategory(existingCategory, existingSubcategory)
        ? existingSubcategory
        : getDefaultCategory(existingCategory);

    return {
      categoryName,
      confidenceScore: 0.5,
      subcategoryName:
        existingClassificationSubcategory && isValidSubcategory(existingCategory, categoryName, existingClassificationSubcategory)
          ? existingClassificationSubcategory
          : getDefaultSubcategory(existingCategory, categoryName),
      supplierType: supplierTypeForSystem(existingCategory),
      systemName: existingCategory,
    } satisfies SystemClassification;
  }

  return {
    categoryName: NEEDS_REVIEW_CATEGORY,
    confidenceScore: 0.18,
    subcategoryName: NEEDS_REVIEW_SUBCATEGORY,
    supplierType: "Needs review",
    systemName: NEEDS_REVIEW_SYSTEM,
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
    ["ც", "item"],
    ["ცალი", "item"],
    ["шт", "item"],
    ["штука", "item"],
    ["m2", "m2"],
    ["m²", "m2"],
    ["sqm", "m2"],
    ["sq.m", "m2"],
    ["კვ.მ", "m2"],
    ["კვმ", "m2"],
    ["м2", "m2"],
    ["м²", "m2"],
    ["m3", "m3"],
    ["m³", "m3"],
    ["cum", "m3"],
    ["კუბ.მ", "m3"],
    ["კუბმ", "m3"],
    ["м3", "m3"],
    ["м³", "m3"],
    ["lm", "m"],
    ["m", "m"],
    ["meter", "m"],
    ["metre", "m"],
    ["მ", "m"],
    ["გ/მ", "m"],
    ["გრძ.მ", "m"],
    ["п.м", "m"],
    ["м.п", "m"],
    ["kg", "kg"],
    ["კგ", "kg"],
    ["кг", "kg"],
    ["ton", "ton"],
    ["tons", "ton"],
    ["ტ", "ton"],
    ["т", "ton"],
    ["lot", "lot"],
    ["ლოტი", "lot"],
    ["set", "set"],
    ["კომპლ", "set"],
    ["компл", "set"],
  ]);

  return aliases.get(normalized) || normalized;
}
