import { FileUp } from "lucide-react";

import { PrimaryActionCard } from "@/components/project-pipeline/primary-action-card";

export function UploadStage({ projectId }: { projectId: string }) {
  return (
    <PrimaryActionCard
      description="AI will extract, classify and prepare it for procurement."
      href={`/projects/${projectId}/documents`}
      icon={FileUp}
      label="Upload File"
      secondaryHref="/projects/new"
      secondaryLabel="Create empty project"
      title="Upload BOQ or Tender File"
    />
  );
}
