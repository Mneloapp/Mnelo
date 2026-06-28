import { Check, Circle } from "lucide-react";

export type AIProgressStep = {
  label: string;
  state: "active" | "done" | "pending";
};

export function AIProgressSteps({ steps }: { steps: AIProgressStep[] }) {
  return (
    <div className="space-y-3">
      {steps.map((step) => {
        const isDone = step.state === "done";
        const isActive = step.state === "active";

        return (
          <div
            className={
              isActive
                ? "flex items-center gap-3 rounded-2xl border border-[#ddd6fe] bg-[#f5f3ff] px-4 py-3"
                : "flex items-center gap-3 rounded-2xl border border-[#e5e7eb] bg-white px-4 py-3"
            }
            key={step.label}
          >
            <span
              className={
                isDone
                  ? "grid h-8 w-8 place-items-center rounded-full bg-[#dcfce7] text-[#16a34a]"
                  : isActive
                    ? "grid h-8 w-8 place-items-center rounded-full bg-[#ede9fe] text-[#7c3aed]"
                    : "grid h-8 w-8 place-items-center rounded-full bg-[#f1f5f9] text-[#94a3b8]"
              }
            >
              {isDone ? <Check className="h-4 w-4" /> : <Circle className="h-3 w-3 fill-current" />}
            </span>
            <span className={isActive ? "text-sm font-semibold text-[#0f172a]" : "text-sm font-medium text-[#64748b]"}>
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
