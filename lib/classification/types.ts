import type { ClassificationMemoryRecord } from "./learning-memory";
import type { ClassificationSource, SystemClassification } from "./rules";

export type { ClassificationSource, SystemClassification, TaxonomyCategory, TaxonomySystem } from "./rules";

export type ClassificationDecisionSource = ClassificationSource;

export type ClassificationUserCorrection = {
  categoryName: string;
  confidenceScore?: number;
  reason?: string | null;
  source?: "user";
  subcategoryName: string | null;
  supplierType?: string;
  systemName: string;
};

export type ClassifyBoqItemInput = {
  category?: string | null;
  classificationSubcategory?: string | null;
  description: string;
  sectionHeader?: string | null;
  sourceSheetName?: string | null;
  subcategory?: string | null;
};

export type ClassifyBoqItemContext = {
  aiClassification?: SystemClassification | null;
  learnedMemory?: ClassificationMemoryRecord[];
  userCorrection?: ClassificationUserCorrection | null;
};

export type BoqItemClassificationResult = {
  categoryName: string;
  confidenceScore: number;
  needsReview: boolean;
  reason: string;
  source: ClassificationDecisionSource;
  subcategoryName: string | null;
  supplierType: string;
  systemName: string;
  userCorrected: boolean;
};
