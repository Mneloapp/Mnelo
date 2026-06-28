"use client";

export function UndoToast({ count, onClose, onUndo }: { count: number; onClose: () => void; onUndo: () => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex max-w-sm items-center gap-4 rounded-2xl border border-[#bbf7d0] bg-white px-4 py-3 shadow-[0_24px_70px_rgba(15,23,42,0.14)]">
      <div>
        <p className="text-sm font-semibold text-[#0f172a]">Decision approved. {count} items updated.</p>
        <p className="text-xs text-slate-500">Prototype state only. Backend data was not changed.</p>
      </div>
      <button className="text-sm font-semibold text-[#15803d]" onClick={onUndo} type="button">
        Undo
      </button>
      <button className="text-sm font-semibold text-slate-400" onClick={onClose} type="button">
        Close
      </button>
    </div>
  );
}
