import type { Confidence } from "@/lib/ai/types/confidence";
import type { Finding, SourceReference } from "@/lib/ai/types/finding";
import type { AgentWarning } from "@/lib/ai/types/warning";

export type AgentResultMetadata = {
  agentId: string;
  agentVersion: string;
  durationMs: number;
  model?: string | null;
  provider?: string | null;
};

export type AgentResult<TOutput extends Record<string, unknown> = Record<string, unknown>> = {
  confidence: Confidence;
  durationMs: number;
  errors: string[];
  findings: Finding[];
  metadata: AgentResultMetadata;
  output: TOutput;
  sourceReferences: SourceReference[];
  success: boolean;
  warnings: AgentWarning[];
};
