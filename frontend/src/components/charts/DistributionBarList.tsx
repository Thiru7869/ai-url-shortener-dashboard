import { DistributionPoint } from "../../types/link";

export default function DistributionBarList({ data }: { data: DistributionPoint[] }) {
  if (data.length === 0) {
    return <p className="flex h-40 items-center justify-center text-sm text-slate-400">No data yet</p>;
  }

  const max = Math.max(...data.map((d) => d.count));

  return (
    <ul className="space-y-2.5">
      {data.map((item) => (
        <li key={item.label} className="flex items-center gap-3">
          <span className="w-28 shrink-0 truncate text-sm text-slate-600" title={item.label}>
            {item.label}
          </span>
          <div className="h-2 flex-1 rounded-full bg-slate-100">
            <div
              className="h-2 rounded-full bg-brand-500"
              style={{ width: `${max === 0 ? 0 : (item.count / max) * 100}%` }}
            />
          </div>
          <span className="w-10 shrink-0 text-right text-sm font-medium text-slate-700 tabular-nums">
            {item.count}
          </span>
        </li>
      ))}
    </ul>
  );
}
