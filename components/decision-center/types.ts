import type { BoqItem } from "@/lib/data";

export type DecisionStatus = "Approved" | "Needs approval" | "Needs review" | "Skipped";

export type DecisionType =
  | "Classification Decision"
  | "Consolidation Decision"
  | "Package Decision"
  | "Procurement Decision"
  | "Quote Decision"
  | "RFQ Decision";

export type DecisionSuggestion = {
  system: string;
  category: string;
  subcategory: string;
};

export type DecisionItem = {
  id: string;
  confidence: number;
  currentClassification: string;
  description: string;
  matchReason: string;
  quantity: string;
  suggestedClassification: string;
  warning?: string;
};

export type ProcurementDecision = {
  id: string;
  type: DecisionType;
  title: string;
  status: DecisionStatus;
  confidence: number;
  impact: string;
  whyAttention: string;
  approvedOutcome: string;
  primaryAction: string;
  explanation: string;
  suggestion: DecisionSuggestion;
  affectedItems: DecisionItem[];
  affectedRequirements: number;
  warning?: string;
};

export type DecisionCenterModel = {
  aiStatus: number;
  completedSummary: string[];
  decisions: ProcurementDecision[];
  projectName: string;
};

export type DecisionCenterSource = {
  boqItems: BoqItem[];
  projectName: string;
};
