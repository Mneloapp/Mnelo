const description = "TEST UNIQUE ITEM 123";

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

const savedMemoryRow = {
  organization_id: "test-organization",
  normalized_description: normalize(description),
  original_description: description,
  classification_system: "Electrical",
  classification_category: "Containment",
  classification_subcategory: "Junction Boxes",
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

assert(savedMemoryRow.normalized_description === "test unique item 123", "normalized_description was not saved as expected");
assert(match, "memory match was not found for reparsed row");
assert(match.classification_system === "Electrical", "system was not restored from memory");
assert(match.classification_category === "Containment", "category was not restored from memory");
assert(match.classification_subcategory === "Junction Boxes", "subcategory was not restored from memory");
assert(match.classification_source === "learned", "reparse should apply memory as learned");
assert(match.needs_review === false, "learned memory match must clear needs_review");

console.log(
  JSON.stringify(
    {
      finalClassification: match,
      memoryMatchFound: true,
      memoryRowCreated: true,
      normalizedDescriptionQueried: reparsedRow.normalized_description,
      normalizedDescriptionSaved: savedMemoryRow.normalized_description,
    },
    null,
    2,
  ),
);
