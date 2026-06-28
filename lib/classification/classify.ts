import { findClassificationMemoryMatch } from "./learning-memory";
import { normalizeClassificationMemoryDescription } from "./normalize";
import { isCompleteClassification, userCorrectionToResult } from "./precedence";
import {
  NEEDS_REVIEW_CATEGORY,
  NEEDS_REVIEW_SYSTEM,
  classifyBoqSystem,
  inferClassificationFromExcelContext,
} from "./rules";
import type { BoqItemClassificationResult, ClassifyBoqItemContext, ClassifyBoqItemInput } from "./types";

function systemClassificationToResult(
  classification: {
    categoryName: string;
    confidenceScore: number;
    reason?: string | null;
    source?: BoqItemClassificationResult["source"];
    subcategoryName?: string | null;
    supplierType: string;
    systemName: string;
  } | null | undefined,
  fallbackSource: BoqItemClassificationResult["source"],
): BoqItemClassificationResult | null {
  if (!classification) {
    return null;
  }

  if (!isCompleteClassification(classification.systemName, classification.categoryName, classification.subcategoryName)) {
    return null;
  }

  return {
    categoryName: classification.categoryName,
    confidenceScore: classification.confidenceScore,
    needsReview: false,
    reason: classification.reason || "Matched central classification engine.",
    source: classification.source || fallbackSource,
    subcategoryName: classification.subcategoryName || null,
    supplierType: classification.supplierType,
    systemName: classification.systemName,
    userCorrected: classification.source === "user" || classification.source === "learned",
  };
}

function needsReviewResult(systemHint?: string | null, reason = "No reliable classification found."): BoqItemClassificationResult {
  return {
    categoryName: NEEDS_REVIEW_CATEGORY,
    confidenceScore: systemHint && systemHint !== NEEDS_REVIEW_SYSTEM ? 0.42 : 0.18,
    needsReview: true,
    reason,
    source: "needs_review",
    subcategoryName: null,
    supplierType: "Needs review",
    systemName: systemHint && systemHint !== NEEDS_REVIEW_SYSTEM ? systemHint : NEEDS_REVIEW_SYSTEM,
    userCorrected: false,
  };
}

export function classifyBoqItem(input: ClassifyBoqItemInput, context: ClassifyBoqItemContext = {}): BoqItemClassificationResult {
  const userClassification = context.userCorrection ? userCorrectionToResult(context.userCorrection) : null;

  if (userClassification) {
    return userClassification;
  }

  const learnedMemory = findClassificationMemoryMatch(input.description, context.learnedMemory || []);

  if (learnedMemory) {
    return {
      categoryName: learnedMemory.category,
      confidenceScore: learnedMemory.confidenceScore,
      needsReview: false,
      reason: `Matched classification learning memory: ${learnedMemory.normalizedDescription}`,
      source: "learned",
      subcategoryName: learnedMemory.subcategory,
      supplierType: "Learned supplier",
      systemName: learnedMemory.system,
      userCorrected: true,
    };
  }

  const aiClassification = context.aiClassification
    ? systemClassificationToResult(context.aiClassification, "ai")
    : null;

  if (aiClassification) {
    return aiClassification;
  }

  const inheritedClassification = inferClassificationFromExcelContext(input.sourceSheetName, input.sectionHeader);
  const inheritedSystemHint =
    inheritedClassification?.systemName && inheritedClassification.systemName !== NEEDS_REVIEW_SYSTEM
      ? inheritedClassification.systemName
      : input.category || null;
  const directRules = classifyBoqSystem(
    input.description,
    inheritedSystemHint,
    input.subcategory,
    input.classificationSubcategory,
  );
  const directRulesResult = systemClassificationToResult(directRules, "rules");

  if (directRulesResult && directRulesResult.confidenceScore >= 0.7) {
    return {
      ...directRulesResult,
      reason: directRules.reason || "Matched classification rules.",
    };
  }

  const contextDescription = [input.description, input.sectionHeader, input.sourceSheetName].filter(Boolean).join(" ");
  const contextRules =
    normalizeClassificationMemoryDescription(contextDescription) !== normalizeClassificationMemoryDescription(input.description)
      ? classifyBoqSystem(contextDescription, inheritedSystemHint, input.subcategory, input.classificationSubcategory)
      : directRules;
  const contextRulesResult = systemClassificationToResult(contextRules, "rules");

  if (contextRulesResult && contextRulesResult.confidenceScore >= 0.7) {
    return {
      ...contextRulesResult,
      reason: contextRules.reason || "Matched classification rules with BOQ context.",
    };
  }

  const inheritedResult = systemClassificationToResult(inheritedClassification || null, "inherited_header");

  if (inheritedResult && inheritedResult.confidenceScore >= 0.82) {
    return {
      ...inheritedResult,
      reason: inheritedClassification?.reason || "Inherited complete classification from Excel context.",
    };
  }

  return needsReviewResult(
    inheritedSystemHint,
    inheritedSystemHint
      ? "System detected, but category and subcategory require review."
      : "No learned memory, AI result or reliable rule match found.",
  );
}
