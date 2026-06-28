import { NEEDS_REVIEW_CATEGORY, NEEDS_REVIEW_SYSTEM, isValidCategory, isValidSubcategory, isValidSystem } from "./rules";
import type { BoqItemClassificationResult, ClassificationUserCorrection } from "./types";

export const classificationPrecedence = ["user", "learned", "ai", "rules", "unknown"] as const;

export function isCompleteClassification(systemName?: string | null, categoryName?: string | null, subcategoryName?: string | null) {
  return Boolean(
    systemName &&
      categoryName &&
      subcategoryName &&
      systemName !== NEEDS_REVIEW_SYSTEM &&
      categoryName !== NEEDS_REVIEW_CATEGORY &&
      isValidSystem(systemName) &&
      isValidCategory(systemName, categoryName) &&
      isValidSubcategory(systemName, categoryName, subcategoryName),
  );
}

export function userCorrectionToResult(correction: ClassificationUserCorrection): BoqItemClassificationResult | null {
  if (!isCompleteClassification(correction.systemName, correction.categoryName, correction.subcategoryName)) {
    return null;
  }

  return {
    categoryName: correction.categoryName,
    confidenceScore: correction.confidenceScore ?? 1,
    needsReview: false,
    reason: correction.reason || "User-confirmed classification.",
    source: correction.source || "user",
    subcategoryName: correction.subcategoryName,
    supplierType: correction.supplierType || "User corrected supplier",
    systemName: correction.systemName,
    userCorrected: true,
  };
}
