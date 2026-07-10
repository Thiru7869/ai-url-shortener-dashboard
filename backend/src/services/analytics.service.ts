import { prisma } from "../config/prisma";
import { AppError } from "../utils/AppError";

export interface DailyClickPoint {
  date: string;
  count: number;
}

export interface DistributionPoint {
  label: string;
  count: number;
}

export interface LinkAnalytics {
  linkId: string;
  totalClicks: number;
  dailyClicks: DailyClickPoint[];
  topReferrers: DistributionPoint[];
  browserDistribution: DistributionPoint[];
  deviceDistribution: DistributionPoint[];
  countryDistribution: DistributionPoint[];
}

const UNKNOWN_LABEL = "Unknown";

async function groupAndCount(linkId: string, field: "referrer" | "browser" | "device" | "country", limit = 10) {
  const rows = await prisma.click.groupBy({
    by: [field],
    where: { linkId },
    _count: { _all: true },
  });

  return rows
    .map((row) => ({
      label: (row[field] as string | null) ?? UNKNOWN_LABEL,
      count: row._count._all,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export async function getLinkAnalytics(linkId: string, days: number): Promise<LinkAnalytics> {
  const link = await prisma.link.findFirst({ where: { id: linkId, deletedAt: null } });
  if (!link) throw AppError.notFound("Link not found");

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - (days - 1));
  since.setUTCHours(0, 0, 0, 0);

  const [totalClicks, dailyRows, topReferrers, browserDistribution, deviceDistribution, countryDistribution] =
    await Promise.all([
      prisma.click.count({ where: { linkId } }),
      prisma.$queryRaw<{ day: Date; count: bigint }[]>`
        SELECT date_trunc('day', "timestamp" AT TIME ZONE 'UTC') AS day, COUNT(*)::bigint AS count
        FROM "clicks"
        WHERE "linkId" = ${linkId} AND "timestamp" >= ${since}
        GROUP BY day
        ORDER BY day ASC
      `,
      groupAndCount(linkId, "referrer"),
      groupAndCount(linkId, "browser"),
      groupAndCount(linkId, "device"),
      groupAndCount(linkId, "country"),
    ]);

  const dailyMap = new Map<string, number>();
  for (const row of dailyRows) {
    dailyMap.set(row.day.toISOString().slice(0, 10), Number(row.count));
  }

  const dailyClicks: DailyClickPoint[] = [];
  for (let i = 0; i < days; i += 1) {
    const d = new Date(since);
    d.setUTCDate(d.getUTCDate() + i);
    const key = d.toISOString().slice(0, 10);
    dailyClicks.push({ date: key, count: dailyMap.get(key) ?? 0 });
  }

  return {
    linkId,
    totalClicks,
    dailyClicks,
    topReferrers,
    browserDistribution,
    deviceDistribution,
    countryDistribution,
  };
}
