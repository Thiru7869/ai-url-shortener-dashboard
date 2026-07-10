interface StatTileProps {
  label: string;
  value: number | string;
  icon: string;
  accent?: "brand" | "emerald" | "amber" | "slate";
}

const ACCENT_CLASSES: Record<NonNullable<StatTileProps["accent"]>, string> = {
  brand: "bg-brand-50 text-brand-600",
  emerald: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
  slate: "bg-slate-100 text-slate-600",
};

export default function StatTile({ label, value, icon, accent = "brand" }: StatTileProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-lg ${ACCENT_CLASSES[accent]}`}>
          {icon}
        </span>
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
    </div>
  );
}
