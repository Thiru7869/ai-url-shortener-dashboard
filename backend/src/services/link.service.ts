import { Link, LinkStatus, Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { redis, linkCacheKey } from "../config/redis";
import { env } from "../config/env";
import { generateShortCode } from "../utils/shortCode";
import { AppError } from "../utils/AppError";
import { buildPaginationMeta, paginationOffset, PaginationMeta } from "../utils/pagination";
import { CreateLinkInput, ListLinksQuery, UpdateLinkInput } from "../validators/link.validators";

export type EffectiveStatus = "ACTIVE" | "DISABLED" | "EXPIRED";

export interface LinkDTO {
  id: string;
  title: string;
  originalUrl: string;
  shortCode: string;
  shortUrl: string;
  isCustomAlias: boolean;
  status: EffectiveStatus;
  rawStatus: LinkStatus;
  expiresAt: string | null;
  clickCount: number;
  createdAt: string;
  updatedAt: string;
}

const MAX_SHORT_CODE_ATTEMPTS = 5;

export function isExpired(expiresAt: Date | null): boolean {
  return expiresAt !== null && expiresAt.getTime() < Date.now();
}

export function deriveStatus(link: Pick<Link, "status" | "expiresAt">): EffectiveStatus {
  if (isExpired(link.expiresAt)) return "EXPIRED";
  return link.status === "DISABLED" ? "DISABLED" : "ACTIVE";
}

export function buildShortUrl(shortCode: string): string {
  return `${env.baseUrl}/${shortCode}`;
}

export function toLinkDTO(link: Link): LinkDTO {
  return {
    id: link.id,
    title: link.title,
    originalUrl: link.originalUrl,
    shortCode: link.shortCode,
    shortUrl: buildShortUrl(link.shortCode),
    isCustomAlias: link.isCustomAlias,
    status: deriveStatus(link),
    rawStatus: link.status,
    expiresAt: link.expiresAt ? link.expiresAt.toISOString() : null,
    clickCount: link.clickCount,
    createdAt: link.createdAt.toISOString(),
    updatedAt: link.updatedAt.toISOString(),
  };
}

async function invalidateCache(shortCode: string): Promise<void> {
  await redis.del(linkCacheKey(shortCode));
}

/** A link is "not expired" when it has no expiry date or its expiry is still in the future. */
function notExpiredFilter(now: Date = new Date()): Prisma.LinkWhereInput["OR"] {
  return [{ expiresAt: null }, { expiresAt: { gte: now } }];
}

export async function createLink(input: CreateLinkInput): Promise<LinkDTO> {
  const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;

  if (input.customAlias) {
    const existing = await prisma.link.findUnique({ where: { shortCode: input.customAlias } });
    if (existing) {
      throw AppError.conflict(`The alias "${input.customAlias}" is already in use. Please choose another.`, {
        field: "customAlias",
      });
    }

    const link = await prisma.link.create({
      data: {
        title: input.title,
        originalUrl: input.originalUrl,
        shortCode: input.customAlias,
        isCustomAlias: true,
        expiresAt,
      },
    });
    return toLinkDTO(link);
  }

  for (let attempt = 0; attempt < MAX_SHORT_CODE_ATTEMPTS; attempt += 1) {
    const shortCode = generateShortCode();
    try {
      const link = await prisma.link.create({
        data: {
          title: input.title,
          originalUrl: input.originalUrl,
          shortCode,
          isCustomAlias: false,
          expiresAt,
        },
      });
      return toLinkDTO(link);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        continue; // collision, retry with a new code
      }
      throw err;
    }
  }

  throw AppError.internal("Could not generate a unique short code. Please try again.");
}

export async function listLinks(
  query: ListLinksQuery,
): Promise<{ items: LinkDTO[]; pagination: PaginationMeta }> {
  const where: Prisma.LinkWhereInput = { deletedAt: null };

  if (query.search) {
    where.OR = [
      { title: { contains: query.search, mode: "insensitive" } },
      { originalUrl: { contains: query.search, mode: "insensitive" } },
      { shortCode: { contains: query.search, mode: "insensitive" } },
    ];
  }

  if (query.status === "ACTIVE") {
    where.status = "ACTIVE";
    where.AND = [{ OR: notExpiredFilter() }];
  } else if (query.status === "DISABLED") {
    where.status = "DISABLED";
  } else if (query.status === "EXPIRED") {
    where.expiresAt = { lt: new Date() };
  }

  const [items, total] = await Promise.all([
    prisma.link.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: paginationOffset(query.page, query.limit),
      take: query.limit,
    }),
    prisma.link.count({ where }),
  ]);

  return {
    items: items.map(toLinkDTO),
    pagination: buildPaginationMeta(query.page, query.limit, total),
  };
}

export async function getLinkById(id: string): Promise<LinkDTO> {
  const link = await prisma.link.findFirst({ where: { id, deletedAt: null } });
  if (!link) throw AppError.notFound("Link not found");
  return toLinkDTO(link);
}

export async function getActiveLinkByShortCode(shortCode: string): Promise<Link | null> {
  return prisma.link.findFirst({ where: { shortCode, deletedAt: null } });
}

export async function updateLink(id: string, input: UpdateLinkInput): Promise<LinkDTO> {
  const existing = await prisma.link.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw AppError.notFound("Link not found");

  const link = await prisma.link.update({
    where: { id },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.originalUrl !== undefined ? { originalUrl: input.originalUrl } : {}),
      ...(input.expiresAt !== undefined ? { expiresAt: input.expiresAt ? new Date(input.expiresAt) : null } : {}),
    },
  });

  await invalidateCache(link.shortCode);
  return toLinkDTO(link);
}

export async function updateLinkStatus(id: string, status: LinkStatus): Promise<LinkDTO> {
  const existing = await prisma.link.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw AppError.notFound("Link not found");

  const link = await prisma.link.update({ where: { id }, data: { status } });
  await invalidateCache(link.shortCode);
  return toLinkDTO(link);
}

export async function softDeleteLink(id: string): Promise<void> {
  const existing = await prisma.link.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw AppError.notFound("Link not found");

  await prisma.link.update({ where: { id }, data: { deletedAt: new Date() } });
  await invalidateCache(existing.shortCode);
}

export interface DashboardStats {
  totalLinks: number;
  totalClicks: number;
  activeLinks: number;
  expiredLinks: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const now = new Date();
  const [totalLinks, activeLinks, expiredLinks, clicksAgg] = await Promise.all([
    prisma.link.count({ where: { deletedAt: null } }),
    prisma.link.count({
      where: { deletedAt: null, status: "ACTIVE", OR: notExpiredFilter(now) },
    }),
    prisma.link.count({ where: { deletedAt: null, expiresAt: { lt: now } } }),
    prisma.link.aggregate({ where: { deletedAt: null }, _sum: { clickCount: true } }),
  ]);

  return {
    totalLinks,
    totalClicks: clicksAgg._sum.clickCount ?? 0,
    activeLinks,
    expiredLinks,
  };
}
