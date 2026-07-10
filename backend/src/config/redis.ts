import Redis from "ioredis";
import { env } from "./env";
import { logger } from "./logger";

export const redis = new Redis(env.redisUrl, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

redis.on("error", (err) => {
  logger.error({ err }, "Redis connection error");
});

redis.on("connect", () => {
  logger.info("Connected to Redis");
});

export const LINK_CACHE_PREFIX = "link:code:";
export const LINK_CACHE_TTL_SECONDS = 6 * 60 * 60; // 6 hours

export function linkCacheKey(shortCode: string): string {
  return `${LINK_CACHE_PREFIX}${shortCode}`;
}
