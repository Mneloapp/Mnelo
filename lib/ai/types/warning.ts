import type { SourceReference } from "@/lib/ai/types/finding";

export type WarningCode =
  | "insufficient_context"
  | "low_confidence"
  | "missing_source"
  | "partial_result"
  | "review_required"
  | "unsupported_input";

export type AgentWarning = {
  code: WarningCode;
  message: string;
  sourceReferences?: SourceReference[];
};
