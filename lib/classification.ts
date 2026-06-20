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
  strongKeywords?: string[];
};

export const systemRules: SystemRule[] = [
  {
    systemName: "Electrical",
    categoryName: "Power and lighting",
    supplierType: "Electrical contractor",
    strongKeywords: [
      "electrical",
      "ელექტრო",
      "ელ.",
      "кабель",
      "электр",
      "щр",
      "switchgear",
      "lighting",
      "განათება",
      "სანათი",
      "როზეტი",
      "ჩამრთველი",
    ],
    keywords: [
      "cable",
      "კაბელ",
      "wire",
      "wiring",
      "panel",
      "board",
      "distribution",
      "db",
      "mccb",
      "mcb",
      "rcd",
      "breaker",
      "conduit",
      "tray",
      "transformer",
      "generator",
      "socket",
      "switch",
      "luminaire",
      "light",
      "led",
      "lamp",
      "დენ",
      "გამანაწილებელი",
      "ავტომატი",
      "მილი ელექტრო",
      "светильник",
      "розетка",
      "выключатель",
      "щит",
      "автомат",
      "провод",
      "труба пвх",
    ],
  },
  {
    systemName: "Plumbing",
    categoryName: "Water and drainage",
    supplierType: "Plumbing contractor",
    strongKeywords: ["plumbing", "სანტექნ", "კანალიზ", "водоснаб", "канализ", "санузел", "water supply"],
    keywords: [
      "pipe",
      "piping",
      "drainage",
      "sanitary",
      "water",
      "valve",
      "pump",
      "fixture",
      "toilet",
      "basin",
      "sink",
      "mixer",
      "trap",
      "sewer",
      "ppr",
      "pvc",
      "hdpe",
      "მილ",
      "წყალ",
      "სანიაღვრე",
      "საკანალიზაციო",
      "უნიტაზ",
      "ხელსაბანი",
      "ნიჟარა",
      "ონკანი",
      "сифон",
      "труба",
      "кран",
      "насос",
      "унитаз",
      "раковина",
      "дренаж",
    ],
  },
  {
    systemName: "HVAC",
    categoryName: "Mechanical air systems",
    supplierType: "Mechanical contractor",
    strongKeywords: ["hvac", "ventilation", "ვენტილ", "კონდიც", "вентиля", "кондиц", "chiller"],
    keywords: [
      "ahu",
      "air handling",
      "duct",
      "diffuser",
      "fan coil",
      "fcu",
      "vrf",
      "split",
      "grille",
      "damper",
      "exhaust",
      "fresh air",
      "cooling",
      "heating",
      "air",
      "ჰაერ",
      "დიფუზორ",
      "გისოს",
      "ვენტილატორ",
      "გამწოვ",
      "воздуховод",
      "диффузор",
      "решетка",
      "вентилятор",
      "чиллер",
      "фанкойл",
    ],
  },
  {
    systemName: "Fire Fighting",
    categoryName: "Fire protection",
    supplierType: "Fire protection contractor",
    strongKeywords: ["fire fighting", "fire protection", "სახანძრო", "ხანძ", "пожар", "огнетуш", "sprinkler"],
    keywords: [
      "hydrant",
      "fire pump",
      "fire alarm",
      "suppression",
      "extinguisher",
      "hose reel",
      "fire cabinet",
      "sprinkler head",
      "სპრინკლერ",
      "ჰიდრანტ",
      "ცეცხლ",
      "კვამლ",
      "пожарный",
      "спринклер",
      "гидрант",
      "дымоудал",
      "шкаф пожар",
    ],
  },
  {
    systemName: "Low Current",
    categoryName: "Technology systems",
    supplierType: "Systems integrator",
    strongKeywords: ["cctv", "access control", "low current", "弱电", "სუსტი დენი", "слаботоч", "видеонаблю"],
    keywords: [
      "data",
      "network",
      "security",
      "bms",
      "telecom",
      "structured cabling",
      "wifi",
      "router",
      "switch network",
      "rack",
      "camera",
      "access point",
      "fire alarm panel",
      "lan",
      "utp",
      "optic",
      "ოპტიკ",
      "ქსელ",
      "კამერ",
      "სიგნალიზ",
      "დაშვების",
      "сеть",
      "камера",
      "скс",
      "оптика",
      "контроль доступа",
    ],
  },
  {
    systemName: "Structural",
    categoryName: "Structure",
    supplierType: "Structural contractor",
    strongKeywords: [
      "structural",
      "structure",
      "ბეტონ",
      "არმატურ",
      "რკინა",
      "მონოლით",
      "бетон",
      "арматур",
      "монолит",
      "foundation",
    ],
    keywords: [
      "concrete",
      "rebar",
      "steel beam",
      "column",
      "slab",
      "formwork",
      "steelwork",
      "beam",
      "blockwork structural",
      "cement",
      "aggregate",
      "grout",
      "screed",
      "mesh",
      "კოლონა",
      "ფილა",
      "საძირკ",
      "ყალიბ",
      "ცემენტ",
      "მოჭიმვ",
      "ბადე",
      "ხსნარი",
      "ბლოკის წყობა",
      "балка",
      "колонна",
      "плита",
      "фундамент",
      "опалубка",
      "стяжка",
      "раствор",
    ],
  },
  {
    systemName: "Civil",
    categoryName: "Site works",
    supplierType: "Civil contractor",
    strongKeywords: ["civil", "earthwork", "excavation", "ასფალტ", "გრუნტ", "землян", "асфальт"],
    keywords: [
      "backfill",
      "road",
      "paving",
      "site works",
      "manhole",
      "trench",
      "curb",
      "kerb",
      "landscape",
      "fence",
      "drain channel",
      "გათხრა",
      "მოსწორება",
      "ტრანშე",
      "ბორდიურ",
      "ჭა",
      "ограждение",
      "траншея",
      "колодец",
      "бордюр",
    ],
  },
  {
    systemName: "Finishes",
    categoryName: "Architectural finishes",
    supplierType: "Finishes contractor",
    strongKeywords: [
      "finish",
      "finishing",
      "ფილა",
      "კაფელ",
      "ჭერი",
      "საღებ",
      "ლესვა",
      "შპაკლი",
      "плитка",
      "покраска",
      "шпаклевка",
      "ceiling",
    ],
    keywords: [
      "tile",
      "paint",
      "flooring",
      "door",
      "window",
      "gypsum",
      "plaster",
      "cladding",
      "laminate",
      "parquet",
      "carpet",
      "wallpaper",
      "skirting",
      "granite",
      "marble",
      "drywall",
      "primer",
      "putty",
      "მოპირკეთ",
      "იატაკ",
      "ლამინატ",
      "პარკეტ",
      "კარი",
      "ფანჯარა",
      "თაბაშირ",
      "შპალერ",
      "გრუნტოვკ",
      "დაგებ",
      "შეღებ",
      "მალიარ",
      "потолок",
      "дверь",
      "окно",
      "гипс",
      "ламинат",
      "штукатур",
      "грунтовка",
    ],
  },
  {
    systemName: "Mechanical",
    categoryName: "Mechanical equipment",
    supplierType: "Mechanical supplier",
    strongKeywords: ["mechanical", "механич", "მექანიკ"],
    keywords: [
      "compressor",
      "motor",
      "bearing",
      "gearbox",
      "shaft",
      "fan",
      "boiler",
      "filter",
      "press",
      "კომპრესორ",
      "ძრავ",
      "ქვაბ",
      "компрессор",
      "двигатель",
      "котел",
      "фильтр",
    ],
  },
  {
    systemName: "Industrial Equipment",
    categoryName: "Plant and machinery",
    supplierType: "Industrial equipment supplier",
    strongKeywords: ["industrial", "equipment", "machinery", "დანადგარ", "оборудован", "станок"],
    keywords: [
      "machine",
      "conveyor",
      "tank",
      "vessel",
      "production line",
      "loader",
      "forklift",
      "crane",
      "hoist",
      "platform",
      "მანქანა",
      "კონვეიერ",
      "ამწე",
      "რეზერვუარ",
      "резервуар",
      "конвейер",
      "кран",
      "погрузчик",
    ],
  },
  {
    systemName: "Furniture",
    categoryName: "Fixtures and furnishings",
    supplierType: "Furniture supplier",
    strongKeywords: ["furniture", "ავეჯ", "мебел"],
    keywords: [
      "desk",
      "chair",
      "table",
      "cabinet",
      "workstation",
      "sofa",
      "shelving",
      "locker",
      "counter",
      "სკამ",
      "მაგიდა",
      "კარადა",
      "თარო",
      "шкаф",
      "стул",
      "стол",
      "полка",
    ],
  },
  {
    systemName: "Medical Equipment",
    categoryName: "Clinical equipment",
    supplierType: "Medical equipment supplier",
    strongKeywords: ["medical", "clinical", "hospital", "სამედიცინო", "კლინიკ", "медицин"],
    keywords: ["patient", "scanner", "laboratory", "surgical", "bedhead", "lab", "ანალიზ", "ლაბორატორ", "сканер", "лаборатор"],
  },
  {
    systemName: "Renewable Energy",
    categoryName: "Energy systems",
    supplierType: "Energy systems supplier",
    strongKeywords: ["solar", "pv", "renewable", "მზის", "солнеч"],
    keywords: ["battery", "inverter", "wind", "energy storage", "panel solar", "აკუმულატორ", "ინვერტორ", "батарея", "инвертор"],
  },
  {
    systemName: "Software",
    categoryName: "Digital systems",
    supplierType: "Software vendor",
    strongKeywords: ["software", "license", "subscription", "პროგრამ", "лиценз", "софт"],
    keywords: ["platform", "integration", "api", "dashboard", "cloud", "database", "system setup", "ინტეგრაცია", "облако"],
  },
  {
    systemName: "Logistics",
    categoryName: "Freight and handling",
    supplierType: "Logistics provider",
    strongKeywords: ["logistics", "freight", "shipping", "ტრანსპორტ", "доставка", "логист"],
    keywords: ["delivery", "transport", "warehouse", "customs", "handling", "loading", "გადაზიდ", "საწყობ", "тамож", "перевоз"],
  },
  {
    systemName: "Office Supplies",
    categoryName: "Consumables",
    supplierType: "Office supplier",
    strongKeywords: ["office supplies", "stationery", "საკანცელ", "канцеляр"],
    keywords: ["paper", "printer", "toner", "folder", "pen", "consumable", "ქაღალდ", "პრინტერ", "тонер", "бумага"],
  },
  {
    systemName: "Construction Materials",
    categoryName: "Materials and consumables",
    supplierType: "Materials supplier",
    strongKeywords: ["material", "მასალა", "материал"],
    keywords: [
      "sand",
      "gravel",
      "brick",
      "block",
      "adhesive",
      "membrane",
      "insulation",
      "sealant",
      "gypsum board",
      "profile",
      "ქვიშა",
      "ხრეში",
      "აგური",
      "ბლოკი",
      "წებო",
      "იზოლაცია",
      "მემბრანა",
      "პროფილი",
      "ფურცელი",
      "кирпич",
      "блок",
      "клей",
      "изоляция",
      "мембрана",
      "профиль",
    ],
  },
];

const knownSystemNames = new Set(systemRules.map((rule) => rule.systemName.toLowerCase()));

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s./-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

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

  for (const keyword of rule.strongKeywords || []) {
    const normalizedKeyword = normalizeText(keyword);

    if (normalizedKeyword && normalizedDescription.includes(normalizedKeyword)) {
      score += 5;
      matches += 1;
    }
  }

  for (const keyword of rule.keywords) {
    const normalizedKeyword = normalizeText(keyword);

    if (!normalizedKeyword) {
      continue;
    }

    if (normalizedDescription.includes(normalizedKeyword)) {
      score += 2;
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
  return systemRules.map((rule) => ({
    categoryName: rule.categoryName,
    systemName: rule.systemName,
  }));
}

export function classifyBoqSystem(description: string, existingCategory?: string | null, existingSubcategory?: string | null) {
  const match = systemRules
    .map((rule) => ({
      ...rule,
      ...scoreRule(description, rule),
    }))
    .sort((a, b) => b.score - a.score)[0];

  if (match && match.score >= 2) {
    return {
      categoryName: match.categoryName,
      confidenceScore: Math.min(0.97, 0.42 + match.score * 0.08),
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
    categoryName: existingSubcategory && existingSubcategory !== "Unclassified" ? existingSubcategory : "Needs review",
    confidenceScore: 0.18,
    supplierType: "Needs review",
    systemName: existingCategory && existingCategory !== "General" ? existingCategory : "Needs Review",
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
