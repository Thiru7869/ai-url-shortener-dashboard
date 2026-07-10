import { EffectiveStatus } from "../types/link";

const STYLES: Record<EffectiveStatus, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  DISABLED: "bg-slate-100 text-slate-600 ring-slate-500/20",
  EXPIRED: "bg-amber-50 text-amber-700 ring-amber-600/20",
};

export default function StatusBadge({ status }: { status: EffectiveStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STYLES[status]}`}
    >
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}
