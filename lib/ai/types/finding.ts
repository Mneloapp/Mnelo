import type { Confidence } from "@/lib/ai/types/confidence";

export type FindingSeverity = "info" | "low" | "medium" | "high";

export type SourceReference = {
  id: string;
  label: string;
  type: "boq_item" | "document" | "entity" | "file" | "knowledge" | "project";
};

export type Finding = {
  id: string;
  confidence: Confidence;
  description: string;
  metadata?: Record<string, unknown>;
  severity: FindingSeverity;
  sourceReferences: SourceReference[];
  title: string;
};
