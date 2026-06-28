const weakTokens = new Set([
  "and",
  "block",
  "cooling",
  "for",
  "item",
  "the",
  "unit",
  "with",
  "აქსესუარებით",
  "ბლოკი",
  "ერთეული",
  "მოწყობილობა",
]);

const productIdentityPatterns = [
  { identity: "VRV outdoor unit", patterns: [/vrv/, /outdoor unit|გარე ბლოკი/] },
  { identity: "Fan Coil", patterns: [/fan coil|\bfcu\b|ფანკოილი/] },
  { identity: "Indoor unit", patterns: [/indoor unit|შიდა ბლოკი/] },
  { identity: "Junction Box", patterns: [/junction box|j box|j-box|გამანაწილებელი კოლოფი/] },
  { identity: "Cable Tray", patterns: [/cable tray|ladder tray|wire mesh tray|კაბელსატარი/] },
  { identity: "Conduit", patterns: [/conduit|installation pipe|corrugated conduit|საინსტალაციო მილი|გოფრირებული მილი|ელექტრო მილი/] },
  { identity: "Motion Sensor", patterns: [/motion sensor|movement sensor|occupancy sensor|presence sensor|pir sensor|მოძრაობის სენსორი/] },
  { identity: "Luminaire", patterns: [/luminaire|light fixture|led panel|downlight|spotlight|სანათი/] },
];

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}.]+\s*/gu, " ")
    .replace(/\b(\d+(?:\.\d+)?)\s+(kw|w|v|kv|a|mm|cm|m|btu|db)\b/giu, "$1$2")
    .replace(/\s+/g, " ")
    .trim();
}

function getProductIdentity(description: string) {
  const normalized = normalizeText(description);

  return (
    productIdentityPatterns.find((entry) => entry.patterns.every((pattern) => pattern.test(normalized)))?.identity || null
  );
}

function getTechnicalSignature(description: string) {
  const normalized = normalizeText(description);
  const signatures = [
    ...normalized.matchAll(/\b\d+(?:\.\d+)?\s*(?:kw|w|v|kv|a|mm|cm|m|btu|btu h|m3 h|l s|db)\b/giu),
    ...normalized.matchAll(/ø\s*\d+(?:\.\d+)?/giu),
    ...normalized.matchAll(/\b\d+\s*x\s*\d+(?:\s*x\s*\d+)?\b/giu),
  ].map((match) => normalizeText(match[0]).replace(/\s+/g, ""));

  return Array.from(new Set(signatures)).sort();
}

function getSignificantTokens(description: string) {
  return normalizeText(description)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !weakTokens.has(token));
}

function jaccard(left: string[], right: string[]) {
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  const intersection = Array.from(leftSet).filter((token) => rightSet.has(token)).length;
  const union = new Set([...leftSet, ...rightSet]).size;

  return union === 0 ? 0 : intersection / union;
}

export type SimilarItemMatch = {
  isSimilar: boolean;
  reason: string;
  score: number;
};

export function getSimilarItemMatch(sourceDescription: string, candidateDescription: string): SimilarItemMatch {
  const sourceNormalized = normalizeText(sourceDescription);
  const candidateNormalized = normalizeText(candidateDescription);

  if (!sourceNormalized || !candidateNormalized) {
    return { isSimilar: false, reason: "Missing product description.", score: 0 };
  }

  if (sourceNormalized === candidateNormalized) {
    return { isSimilar: true, reason: "Exact normalized description match.", score: 1 };
  }

  const sourceIdentity = getProductIdentity(sourceDescription);
  const candidateIdentity = getProductIdentity(candidateDescription);

  if (!sourceIdentity || !candidateIdentity) {
    return { isSimilar: false, reason: "No strong shared product identity.", score: 0 };
  }

  if (sourceIdentity !== candidateIdentity) {
    return {
      isSimilar: false,
      reason: `Different product identity: ${sourceIdentity} vs ${candidateIdentity}.`,
      score: 0,
    };
  }

  const sourceSpecs = getTechnicalSignature(sourceDescription);
  const candidateSpecs = getTechnicalSignature(candidateDescription);

  if (sourceSpecs.join("|") !== candidateSpecs.join("|")) {
    return {
      isSimilar: false,
      reason: "Technical signature differs, so this needs separate review.",
      score: 0,
    };
  }

  const overlap = jaccard(getSignificantTokens(sourceDescription), getSignificantTokens(candidateDescription));

  if (overlap >= 0.82) {
    return {
      isSimilar: true,
      reason: `Same product identity (${sourceIdentity}) with matching technical signature.`,
      score: overlap,
    };
  }

  return {
    isSimilar: false,
    reason: `Shared ${sourceIdentity} identity, but description overlap is too weak for bulk correction.`,
    score: overlap,
  };
}
