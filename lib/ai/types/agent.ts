import type { AgentContext } from "@/lib/ai/types/agent-context";
import type { AgentResult } from "@/lib/ai/types/agent-result";

export type AgentSchema = {
  description: string;
  name: string;
  version: string;
};

export type AgentExecute<TContext extends AgentContext, TOutput extends Record<string, unknown>> = (
  context: TContext,
) => Promise<AgentResult<TOutput>>;

export type Agent<TContext extends AgentContext = AgentContext, TOutput extends Record<string, unknown> = Record<string, unknown>> = {
  description: string;
  execute: AgentExecute<TContext, TOutput>;
  id: string;
  inputSchema: AgentSchema;
  name: string;
  outputSchema: AgentSchema;
  version: string;
};
