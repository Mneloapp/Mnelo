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

function toParsedRowInsertPayload({ description, prediction }) {
  return {
    category: prediction.systemName,
    classification_category: prediction.categoryName,
    classification_confidence: prediction.confidenceScore,
    classification_reason: prediction.reason,
    classification_source: prediction.source,
    classification_status: prediction.needsReview ? "needs_review" : "classified",
    classification_subcategory: prediction.subcategoryName,
    classification_system: prediction.systemName,
    confidence_score: prediction.confidenceScore,
    description,
    needs_review: prediction.needsReview,
    subcategory: prediction.categoryName,
    user_corrected: prediction.userCorrected,
  };
}

const rawDescription = "EXIT, გასასვლელის მაჩვენებელი, მიმართულება გარეთ, ელემენტზე მომუშავე, მინიმუმ 90 წუთი";
const memoryNormalizedDescription = normalizeClassificationMemoryDescription(rawDescription);
const reparseNormalizedDescription = normalizeClassificationMemoryDescription(rawDescription);
const learningMemory = [
  {
    category: "Lighting",
    confidenceScore: 1,
    normalizedDescription: memoryNormalizedDescription,
    originalDescription: rawDescription,
    source: "user",
    subcategory: "Exit Signs",
    system: "Electrical",
  },
];
const prediction = classifyBoqItem(
  {
    description: rawDescription,
    sourceSheetName: "ELECTRICITY",
  },
  {
    learnedMemory: learningMemory,
  },
);
const insertPayload = toParsedRowInsertPayload({
  description: rawDescription,
  prediction,
});

assert(memoryNormalizedDescription === reparseNormalizedDescription, "Memory and reparse normalized descriptions must match");
assert(learningMemory.length === 1, "Learning memory records must be loaded for this regression");
assert(prediction.source === "learned", "Reparse classification must use learned memory");
assert(prediction.systemName === "Electrical", "Learned system was not applied");
assert(prediction.categoryName === "Lighting", "Learned category was not applied");
assert(prediction.subcategoryName === "Exit Signs", "Learned subcategory was not applied");
assert(prediction.needsReview === false, "Learned memory must clear Needs Review");
assert(insertPayload.classification_system === "Electrical", "Insert payload system was not learned");
assert(insertPayload.classification_category === "Lighting", "Insert payload category was not learned");
assert(insertPayload.classification_subcategory === "Exit Signs", "Insert payload subcategory was not learned");
assert(insertPayload.classification_source === "learned", "Insert payload source was not learned");
assert(insertPayload.needs_review === false, "Insert payload should not need review");

console.log(
  JSON.stringify(
    {
      insertPayload,
      learningMemoryLoaded: learningMemory.length,
      memoryNormalizedDescription,
      prediction,
      rawDescription,
      reparseNormalizedDescription,
    },
    null,
    2,
  ),
);
