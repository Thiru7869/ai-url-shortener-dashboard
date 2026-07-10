import { useState } from "react";
import { useParams } from "react-router-dom";
import { useLink, useLinkAnalytics } from "../hooks/useLinks";
import DailyClicksChart from "../components/charts/DailyClicksChart";
import DistributionPieChart from "../components/charts/DistributionPieChart";
import DistributionBarList from "../components/charts/DistributionBarList";
import StatTile from "../components/StatTile";
import StatusBadge from "../components/StatusBadge";

const DAY_OPTIONS = [7, 30, 90];

export default function AnalyticsPage() {
  const { id } = useParams<{ id: string }>();
  const [days, setDays] = useState(30);

  const { data: link, isLoading: linkLoading } = useLink(id);
  const { data: analytics, isLoading: analyticsLoading } = useLinkAnalytics(id, days);

  if (linkLoading || analyticsLoading || !link || !analytics) {
    return <div className="p-10 text-center text-sm text-slate-500">Loading analytics…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-slate-900">{link.title}</h1>
            <StatusBadge status={link.status} />
          </div>
          <a
            href={link.shortUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            {link.shortUrl}
          </a>
          <p className="mt-1 text-sm text-slate-500 truncate max-w-lg">→ {link.originalUrl}</p>
        </div>
        <div className="flex gap-1.5" role="group" aria-label="Select analytics time range">
          {DAY_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setDays(option)}
              aria-pressed={days === option}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                days === option ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {option}d
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile label="Total Clicks" value={analytics.totalClicks} icon="👆" accent="brand" />
        <StatTile label="Lifetime Clicks" value={link.clickCount} icon="📈" accent="emerald" />
        <StatTile label="Created" value={new Date(link.createdAt).toLocaleDateString()} icon="📅" accent="slate" />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Daily Clicks (last {days} days)</h2>
        <DailyClicksChart data={analytics.dailyClicks} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Browser Distribution</h2>
          <DistributionPieChart data={analytics.browserDistribution} />
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Device Distribution</h2>
          <DistributionPieChart data={analytics.deviceDistribution} />
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Top Referrers</h2>
          <DistributionBarList data={analytics.topReferrers} />
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Country Distribution</h2>
          <DistributionBarList data={analytics.countryDistribution} />
        </div>
      </div>
    </div>
  );
}
