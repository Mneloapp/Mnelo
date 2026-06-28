import type { BoqItem } from "@/lib/data";

export type ManualReviewStatus = "Learned" | "Low Confidence" | "Needs Review" | "Ready";

export type ClassificationValue = {
  system: string;
  category: string | null;
  subcategory: string | null;
};

export type ProductGroup = {
  id: string;
  name: string;
  normalizedIdentity: string;
  system: string;
  category: string;
  subcategory: string | null;
  unit: string | null;
  rows: BoqItem[];
  totalQuantity: number | null;
  averageConfidence: number;
  status: ManualReviewStatus;
  technicalMarkers: string[];
  whyGrouped: string[];
};

export type PrototypeChange = {
  classification: ClassificationValue;
  previousClassifications: Record<string, ClassificationValue>;
  rowIds: string[];
};
