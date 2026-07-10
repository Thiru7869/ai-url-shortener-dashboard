import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { format } from "date-fns";
import { DailyClickPoint } from "../../types/link";

export default function DailyClicksChart({ data }: { data: DailyClickPoint[] }) {
  const chartData = data.map((point) => ({ ...point, label: format(new Date(point.date), "MMM d") }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="clicksGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.35} />
            <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#64748b" }} tickLine={false} axisLine={false} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#64748b" }} tickLine={false} axisLine={false} width={32} />
        <Tooltip
          contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
          labelFormatter={(label) => `Date: ${label}`}
        />
        <Area type="monotone" dataKey="count" stroke="#4f46e5" strokeWidth={2} fill="url(#clicksGradient)" name="Clicks" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
