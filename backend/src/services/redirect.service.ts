import { Link } from "@prisma/client";
import { prisma } from "../config/prisma";
import { redis, linkCacheKey, LINK_CACHE_TTL_SECONDS } from "../config/redis";
import { logger } from "../config/logger";
import { getActiveLinkByShortCode, isExpired } from "./link.service";
import { RequestMeta } from "../utils/requestMeta";

interface CachedLink {
  id: string;
  originalUrl: string;
  status: "ACTIVE" | "DISABLED";
  expiresAt: string | null;
}

function toCachedLink(link: Link): CachedLink {
  return {
    id: link.id,
    originalUrl: link.originalUrl,
    status: link.status,
    expiresAt: link.expiresAt ? link.expiresAt.toISOString() : null,
  };
}

export type RedirectResult =
  | { outcome: "redirect"; linkId: string; originalUrl: string }
  | { outcome: "not_found" }
  | { outcome: "disabled" }
  | { outcome: "expired" };

export async function resolveShortCode(shortCode: string): Promise<RedirectResult> {
  const cacheKey = linkCacheKey(shortCode);

  let cached: CachedLink | null = null;
  try {
    const raw = await redis.get(cacheKey);
    if (raw) cached = JSON.parse(raw) as CachedLink;
  } catch (err) {
    logger.warn({ err }, "Redis read failed, falling back to database");
  }

  let link: CachedLink | null = cached;

  if (!link) {
    const dbLink = await getActiveLinkByShortCode(shortCode);
    if (!dbLink) return { outcome: "not_found" };

    link = toCachedLink(dbLink);
    redis.set(cacheKey, JSON.stringify(link), "EX", LINK_CACHE_TTL_SECONDS).catch((err) => {
      logger.warn({ err }, "Redis write failed");
    });
  }

  if (link.status === "DISABLED") return { outcome: "disabled" };
  if (isExpired(link.expiresAt ? new Date(link.expiresAt) : null)) return { outcome: "expired" };

  return { outcome: "redirect", linkId: link.id, originalUrl: link.originalUrl };
}

export function recordClickAsync(linkId: string, meta: RequestMeta): void {
  // Fire-and-forget: never block the redirect response on this write. The click
  // log and the denormalized counter are still written atomically (one transaction)
  // so they can't drift from each other if one half fails.
  void prisma
    .$transaction([
      prisma.click.create({
        data: {
          linkId,
          browser: meta.browser,
          os: meta.os,
          device: meta.device,
          country: meta.country,
          referrer: meta.referrer,
          ipHash: meta.ipHash,
        },
      }),
      prisma.link.update({ where: { id: linkId }, data: { clickCount: { increment: 1 } } }),
    ])
    .catch((err) => {
    logger.error({ err, linkId }, "Failed to record click");
  });
}
