import { createRequire } from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url);

require.extensions[".ts"] = (module, filename) => {
  const source = require("node:fs").readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: filename,
  });

  module._compile(output.outputText, filename);
};

const { classifyBoqItem, normalizeClassificationMemoryDescription } = require("../lib/classification/index.ts");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function memory(description, systemName, categoryName, subcategoryName) {
  return {
    category: categoryName,
    confidenceScore: 1,
    normalizedDescription: normalizeClassificationMemoryDescription(description),
    originalDescription: description,
    source: "user",
    subcategory: subcategoryName,
    system: systemName,
  };
}

const unknown = classifyBoqItem({
  description: "ZXQ ALPHA BETA 12345",
});

assert(unknown.source === "needs_review", "Unknown arbitrary item must start as Needs Review");
assert(unknown.needsReview === true, "Unknown arbitrary item must require review");

const learnedDescription = "TEST UNIQUE ITEM 999";
const learned = classifyBoqItem(
  { description: learnedDescription },
  {
    learnedMemory: [memory(learnedDescription, "Electrical", "Containment", "Junction Boxes")],
  },
);

assert(learned.source === "learned", "Manual memory must classify future/reparsed rows as learned");
assert(learned.systemName === "Electrical", "Learned system was not applied");
assert(learned.categoryName === "Containment", "Learned category was not applied");
assert(learned.subcategoryName === "Junction Boxes", "Learned subcategory was not applied");
assert(learned.needsReview === false, "Learned match must clear Needs Review");

const conduit = classifyBoqItem({
  description: "ორშრიანი საინსტალაციო მილი Ø20 (აქსესუარებით სამაგრით)",
});

assert(conduit.systemName === "Electrical", "Conduit phrase should classify as Electrical");
assert(conduit.categoryName === "Containment", "Conduit phrase should classify as Containment");
assert(conduit.subcategoryName === "Conduits", "Conduit phrase should classify as Conduits");
assert(conduit.needsReview === false, "Conduit phrase should not require review");

const electricalUnknown = classifyBoqItem({
  description: "ელექტრო გაურკვეველი აქსესუარი without clear category",
  sourceSheetName: "ELECTRICITY",
});

assert(electricalUnknown.systemName === "Electrical", "Electrical unknown should keep Electrical system hint");
assert(electricalUnknown.categoryName !== "Lighting", "Electrical unknown must not default to Lighting");
assert(electricalUnknown.subcategoryName !== "Fixtures", "Electrical unknown must not default to Lighting fixtures");
assert(electricalUnknown.needsReview === true, "Electrical unknown should require review");

const learnedBeatsRules = classifyBoqItem(
  { description: "LED Luminaire" },
  {
    learnedMemory: [memory("LED Luminaire", "Electrical", "Containment", "Junction Boxes")],
  },
);

assert(learnedBeatsRules.source === "learned", "Learned memory must beat rules");
assert(learnedBeatsRules.categoryName === "Containment", "Learned category must beat Lighting rule");
assert(learnedBeatsRules.subcategoryName === "Junction Boxes", "Learned subcategory must beat Lighting rule");

console.log(
  JSON.stringify(
    {
      unknown,
      learned,
      conduit,
      electricalUnknown,
      learnedBeatsRules,
    },
    null,
    2,
  ),
);
