import { Sparkles } from "lucide-react";

import { AIProgressSteps } from "@/components/project-pipeline/ai-progress-steps";

export function AIProcessingStage({ projectId }: { projectId: string }) {
  return (
    <section className="rounded-[28px] border border-[#e5e7eb] bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.05)]">
      <div className="mx-auto max-w-2xl text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-[20px] bg-[#f5f3ff] text-[#7c3aed]">
          <Sparkles className="h-6 w-6" />
        </div>
        <h2 className="mt-6 text-3xl font-semibold tracking-[-0.02em] text-[#0f172a]">AI is preparing your project</h2>
        <p className="mt-3 text-base leading-7 text-[#64748b]">
          Mnelo is turning the uploaded file into organized procurement information.
        </p>
      </div>
      <div className="mx-auto mt-8 max-w-xl">
        <AIProgressSteps
          steps={[
            { label: "Reading file", state: "done" },
            { label: "Extracting items", state: "active" },
            { label: "Detecting systems", state: "pending" },
            { label: "Organizing by direction", state: "pending" },
            { label: "Finding items that need review", state: "pending" },
          ]}
        />
      </div>
      <div className="mt-8 text-center">
        <a className="text-sm font-semibold text-[#15803d] hover:text-[#166534]" href={`/projects/${projectId}/documents`}>
          Open file processing
        </a>
      </div>
    </section>
  );
}
