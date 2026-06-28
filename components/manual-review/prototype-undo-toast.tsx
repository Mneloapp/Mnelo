"use client";

export function PrototypeUndoToast({
  count,
  onDismiss,
  onUndo,
}: {
  count: number;
  onDismiss: () => void;
  onUndo: () => void;
}) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex max-w-sm items-center gap-4 rounded-2xl border border-[#bbf7d0] bg-white px-4 py-3 shadow-[0_24px_60px_rgba(15,23,42,0.14)]">
      <div>
        <p className="text-sm font-semibold text-[#0f172a]">{count} rows updated in prototype.</p>
        <p className="text-xs text-slate-500">No project data was changed.</p>
      </div>
      <button className="text-sm font-semibold text-[#15803d]" onClick={onUndo} type="button">
        Undo
      </button>
      <button className="text-sm font-semibold text-slate-400" onClick={onDismiss} type="button">
        Close
      </button>
    </div>
  );
}
