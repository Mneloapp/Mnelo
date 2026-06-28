import { CheckCircle2 } from "lucide-react";
import { PrimaryActionCard } from "@/components/project-pipeline/primary-action-card";

export function ReviewCompleteStage({ projectId }: { projectId: string }) {
  return (
    <PrimaryActionCard
      description="All required items are confirmed. Your project is ready for the next stage."
      href={`/projects/${projectId}/requirements`}
      icon={CheckCircle2}
      label="Continue to Packages"
      title="Review Complete"
    />
  );
}
