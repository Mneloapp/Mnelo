import type { Agent, AgentExecute, AgentSchema } from "@/lib/ai/types/agent";
import type { AgentContext } from "@/lib/ai/types/agent-context";

export type CreateAgentInput<TContext extends AgentContext, TOutput extends Record<string, unknown>> = {
  description: string;
  execute: AgentExecute<TContext, TOutput>;
  id: string;
  inputSchema: AgentSchema;
  name: string;
  outputSchema: AgentSchema;
  version: string;
};

export function createAgent<TContext extends AgentContext, TOutput extends Record<string, unknown>>(
  input: CreateAgentInput<TContext, TOutput>,
): Agent<TContext, TOutput> {
  return {
    description: input.description,
    execute: input.execute,
    id: input.id,
    inputSchema: input.inputSchema,
    name: input.name,
    outputSchema: input.outputSchema,
    version: input.version,
  };
}
