const cases = [
  {
    description: "TEST UNIQUE ITEM 123",
    expected: {
      classification_category: "Containment",
      classification_subcategory: "Junction Boxes",
      classification_system: "Electrical",
    },
  },
  {
    description: "ორშრიანი საინსტალაციო მილი Ø20 (აქსესუარებით სამაგრით)",
    expected: {
      classification_category: "Containment",
      classification_subcategory: "Conduits",
      classification_system: "Electrical",
    },
  },
];

function normalize(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function simulateManualSaveAndReparse({ description, expected }) {
  const savedMemoryRow = {
    organization_id: "test-organization",
    normalized_description: normalize(description),
    original_description: description,
    classification_system: expected.classification_system,
    classification_category: expected.classification_category,
    classification_subcategory: expected.classification_subcategory,
    source: "user",
    confidence_score: 1,
  };

  const reparsedRow = {
    description,
    normalized_description: normalize(description),
  };

  const match =
    savedMemoryRow.normalized_description === reparsedRow.normalized_description
      ? {
          classification_source: "learned",
          classification_system: savedMemoryRow.classification_system,
          classification_category: savedMemoryRow.classification_category,
          classification_subcategory: savedMemoryRow.classification_subcategory,
          needs_review: false,
        }
      : null;

  assert(savedMemoryRow.normalized_description.length > 0, "normalized_description was not saved");
  assert(match, "memory match was not found for reparsed row");
  assert(match.classification_system === expected.classification_system, "system was not restored from memory");
  assert(match.classification_category === expected.classification_category, "category was not restored from memory");
  assert(match.classification_subcategory === expected.classification_subcategory, "subcategory was not restored from memory");
  assert(match.classification_source === "learned", "reparse should apply memory as learned");
  assert(match.needs_review === false, "learned memory match must clear needs_review");

  return {
    description,
    finalClassification: match,
    memoryMatchFound: true,
    memoryRowCreated: true,
    normalizedDescriptionQueried: reparsedRow.normalized_description,
    normalizedDescriptionSaved: savedMemoryRow.normalized_description,
  };
}

console.log(JSON.stringify(cases.map(simulateManualSaveAndReparse), null, 2));
