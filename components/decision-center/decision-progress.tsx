"use client";

const steps = ["Analyze", "Identify", "Prepare", "Review", "Source", "Award"];

export function DecisionProgress({ activeStep = 3 }: { activeStep?: number }) {
  return (
    <div className="rounded-[20px] border border-[#e5e7eb] bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Decision flow</p>
      <div className="mt-4 grid gap-3 md:grid-cols-6">
        {steps.map((step, index) => {
          const isDone = index < activeStep;
          const isActive = index === activeStep;
          return (
            <div className="flex items-center gap-2" key={step}>
              <span
                className={
                  isDone
                    ? "h-2.5 w-2.5 rounded-full bg-[#22c55e]"
                    : isActive
                      ? "h-2.5 w-2.5 rounded-full bg-[#7c3aed]"
                      : "h-2.5 w-2.5 rounded-full bg-slate-200"
                }
              />
              <span className={isActive ? "text-sm font-semibold text-[#0f172a]" : "text-sm text-slate-500"}>{step}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
