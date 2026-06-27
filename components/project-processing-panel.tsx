import { AlertCircle, CheckCircle2, Clock3, FileText, Loader2 } from "lucide-react";
import {
  getProcessingStageLabel,
  getProcessingStatusLabel,
  type ProcessingStatus,
  type ProjectProcessingItem,
} from "@/lib/project-processing";

function statusStyles(status: ProcessingStatus) {
  const styles: Record<ProcessingStatus, string> = {
    completed: "bg-[#ecfdf3] text-[#087a36] ring-[#bbf7d0]",
    failed: "bg-red-50 text-red-700 ring-red-200",
    needs_review: "bg-[#fff7ed] text-[#c2410c] ring-[#fed7aa]",
    processing: "bg-blue-50 text-blue-700 ring-blue-200",
    queued: "bg-slate-50 text-slate-600 ring-slate-200",
  };

  return styles[status];
}

function StatusIcon({ status }: { status: ProcessingStatus }) {
  if (status === "completed") {
    return <CheckCircle2 aria-hidden="true" className="h-4 w-4" strokeWidth={2} />;
  }

  if (status === "processing") {
    return <Loader2 aria-hidden="true" className="h-4 w-4" strokeWidth={2} />;
  }

  if (status === "failed" || status === "needs_review") {
    return <AlertCircle aria-hidden="true" className="h-4 w-4" strokeWidth={2} />;
  }

  return <Clock3 aria-hidden="true" className="h-4 w-4" strokeWidth={2} />;
}

export function ProjectProcessingPanel({ items }: { items: ProjectProcessingItem[] }) {
  return (
    <div className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.04)]">
      <div className="flex flex-col gap-2 border-b border-[#e5e7eb] pb-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-[#07130f]">Processing pipeline</h3>
          <p className="mt-1 text-sm text-slate-500">
            The first activity layer for the Project Intelligence Engine. Items are derived from uploaded documents until
            dedicated processing jobs are introduced.
          </p>
        </div>
        <span className="rounded-full bg-[#ecfdf3] px-3 py-1 text-xs font-semibold text-[#087a36]">
          Project Intelligence Engine
        </span>
      </div>

      {items.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-[#cbd5e1] bg-[#fbfdfb] p-8 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#ecfdf3] text-[#16a34a]">
            <FileText aria-hidden="true" className="h-5 w-5" strokeWidth={2} />
          </div>
          <h4 className="mt-4 text-base font-semibold text-[#07130f]">No documents to process</h4>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
            Processing will start after project documents are analyzed.
          </p>
        </div>
      ) : (
        <div className="mt-5 overflow-x-auto rounded-2xl border border-[#edf0ed]">
          <div className="grid min-w-[920px] grid-cols-[minmax(18rem,1fr)_9rem_10rem_8rem_12rem] gap-4 bg-[#fbfdfb] px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#64748b]">
            <span>Document</span>
            <span>Status</span>
            <span>Current stage</span>
            <span>Confidence</span>
            <span>Timestamp</span>
          </div>
          <div className="min-w-[920px] divide-y divide-[#edf0ed] bg-white">
            {items.map((item) => (
              <div
                className="grid grid-cols-[minmax(18rem,1fr)_9rem_10rem_8rem_12rem] gap-4 px-4 py-4 text-sm"
                key={item.id}
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-[#0f172a]">{item.fileName}</p>
                  <p className="mt-1 text-xs text-[#64748b]">{item.documentType}</p>
                  {item.errorMessage ? <p className="mt-2 text-xs font-medium text-red-700">{item.errorMessage}</p> : null}
                </div>
                <span
                  className={`inline-flex h-7 w-fit items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold ring-1 ${statusStyles(
                    item.status,
                  )}`}
                >
                  <StatusIcon status={item.status} />
                  {getProcessingStatusLabel(item.status)}
                </span>
                <span className="font-medium text-[#334155]">{getProcessingStageLabel(item.stage)}</span>
                <span className="text-[#64748b]">
                  {item.confidence === null ? "Not available" : `${Math.round(item.confidence * 100)}%`}
                </span>
                <span className="text-[#64748b]">{item.timestamp}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
