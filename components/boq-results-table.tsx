import { BoqItem } from "@/lib/data";
import { Badge } from "@/components/ui";

export function BoqResultsTable({ items }: { items: BoqItem[] }) {
  return (
    <section className="overflow-hidden rounded-xl border border-line bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-ink">BOQ Results</h2>
          <p className="text-sm text-ink/55">Parsed rows from uploaded Excel BOQ workbooks.</p>
        </div>
        <Badge tone={items.length > 0 ? "green" : "neutral"}>{items.length} parsed rows</Badge>
      </div>

      {items.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-line text-left text-sm">
            <thead className="bg-mist/70 text-xs uppercase tracking-wide text-ink/45">
              <tr>
                <th className="px-5 py-3 font-semibold">Description</th>
                <th className="px-5 py-3 text-right font-semibold">Quantity</th>
                <th className="px-5 py-3 font-semibold">Unit</th>
                <th className="px-5 py-3 font-semibold">Sheet</th>
                <th className="px-5 py-3 text-right font-semibold">Row</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-white">
              {items.map((item) => (
                <tr key={item.id} className="transition hover:bg-leaf-50/40">
                  <td className="min-w-72 px-5 py-4 font-medium text-ink">{item.description}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-right text-ink/70">
                    {item.quantity.toLocaleString()}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-ink/60">{item.unit}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-ink/60">{item.sheetName}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-right font-mono text-xs text-ink/45">
                    {item.rowNumber}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-8 text-center">
          <p className="font-medium text-ink">No BOQ rows parsed yet</p>
          <p className="mt-2 text-sm text-ink/55">
            Upload an Excel BOQ file with description, quantity, and unit columns to populate this table.
          </p>
        </div>
      )}
    </section>
  );
}
