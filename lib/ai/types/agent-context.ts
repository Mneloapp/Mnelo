export type AgentContextProject = {
  id: string;
  client?: string | null;
  location?: string | null;
  name: string;
  workType?: string | null;
};

export type AgentContextDocument = {
  id: string;
  documentType: string;
  fileName: string;
  language?: string | null;
  revision?: string | null;
};

export type AgentContextFile = {
  id: string;
  fileName: string;
  fileType: string;
  storagePath?: string | null;
};

export type AgentContextBoqItem = {
  id: string;
  description: string;
  quantity?: number | null;
  unit?: string | null;
};

export type AgentContextUser = {
  id: string;
  email?: string | null;
};

export type AgentContextOrganization = {
  id: string;
  name: string;
};

export type AgentContextKnowledge = {
  id: string;
  confidence?: number | null;
  label: string;
  sourceId?: string | null;
  type: string;
};

export type WorkflowStage =
  | "boq_parsing"
  | "classification"
  | "document_intelligence"
  | "entity_extraction"
  | "knowledge_creation"
  | "review"
  | "upload";

export type AgentContext = {
  boqItems?: AgentContextBoqItem[];
  documents?: AgentContextDocument[];
  files?: AgentContextFile[];
  language?: string | null;
  organization?: AgentContextOrganization | null;
  previousKnowledge?: AgentContextKnowledge[];
  project?: AgentContextProject | null;
  user?: AgentContextUser | null;
  workflowStage?: WorkflowStage;
};
