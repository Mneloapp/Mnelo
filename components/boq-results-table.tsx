import { BoqItem, formatCurrency } from "@/lib/data";
import { Badge } from "@/components/ui";

export function BoqResultsTable({ items }: { items: BoqItem[] }) {
  const total = items.reduce((sum, item) => sum + item.quantity * item.unitRate, 0);

  return (
    <section className="overflow-hidden rounded-xl border border-line bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-ink">BOQ Results</h2>
          <p className="text-sm text-ink/55">AI extracted quantities with supplier-ready pricing.</p>
        </div>
        <Badge tone="green">{formatCurrency(total)} estimated</Badge>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-line text-left text-sm">
          <thead className="bg-mist/70 text-xs uppercase tracking-wide text-ink/45">
            <tr>
              <th className="px-5 py-3 font-semibold">Code</th>
              <th className="px-5 py-3 font-semibold">System</th>
              <th className="min-w-72 px-5 py-3 font-semibold">Description</th>
              <th className="px-5 py-3 text-right font-semibold">Qty</th>
              <th className="px-5 py-3 font-semibold">Unit</th>
              <th className="px-5 py-3 text-right font-semibold">Rate</th>
              <th className="px-5 py-3 text-right font-semibold">Total</th>
              <th className="px-5 py-3 font-semibold">Confidence</th>
              <th className="px-5 py-3 font-semibold">Supplier</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line bg-white">
            {items.map((item) => (
              <tr key={item.id} className="transition hover:bg-leaf-50/40">
                <td className="whitespace-nowrap px-5 py-4 font-mono text-xs font-semibold text-ink">
                  {item.id}
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-ink/70">{item.system}</td>
                <td className="px-5 py-4 font-medium text-ink">{item.description}</td>
                <td className="whitespace-nowrap px-5 py-4 text-right text-ink/70">
                  {item.quantity.toLocaleString()}
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-ink/60">{item.unit}</td>
                <td className="whitespace-nowrap px-5 py-4 text-right text-ink/70">
                  {formatCurrency(item.unitRate)}
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-right font-semibold text-ink">
                  {formatCurrency(item.quantity * item.unitRate)}
                </td>
                <td className="whitespace-nowrap px-5 py-4">
                  <Badge tone={item.confidence >= 90 ? "green" : "amber"}>{item.confidence}%</Badge>
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-ink/70">{item.supplier}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
