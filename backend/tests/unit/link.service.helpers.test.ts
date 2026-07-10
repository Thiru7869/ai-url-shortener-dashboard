import { deriveStatus, isExpired, buildShortUrl, toLinkDTO } from "../../src/services/link.service";
import { Link } from "@prisma/client";

function buildLink(overrides: Partial<Link> = {}): Link {
  return {
    id: "clx123",
    title: "Test Link",
    originalUrl: "https://example.com",
    shortCode: "abc1234",
    isCustomAlias: false,
    status: "ACTIVE",
    expiresAt: null,
    clickCount: 5,
    deletedAt: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

describe("isExpired", () => {
  it("returns false when there is no expiry date", () => {
    expect(isExpired(null)).toBe(false);
  });

  it("returns true for a past date", () => {
    expect(isExpired(new Date(Date.now() - 1000))).toBe(true);
  });

  it("returns false for a future date", () => {
    expect(isExpired(new Date(Date.now() + 1000))).toBe(false);
  });
});

describe("deriveStatus", () => {
  it("prioritizes EXPIRED over ACTIVE when the expiry date has passed", () => {
    const link = buildLink({ status: "ACTIVE", expiresAt: new Date(Date.now() - 1000) });
    expect(deriveStatus(link)).toBe("EXPIRED");
  });

  it("prioritizes EXPIRED over DISABLED when the expiry date has passed", () => {
    const link = buildLink({ status: "DISABLED", expiresAt: new Date(Date.now() - 1000) });
    expect(deriveStatus(link)).toBe("EXPIRED");
  });

  it("returns DISABLED for a non-expired disabled link", () => {
    const link = buildLink({ status: "DISABLED", expiresAt: null });
    expect(deriveStatus(link)).toBe("DISABLED");
  });

  it("returns ACTIVE for a non-expired active link", () => {
    const link = buildLink({ status: "ACTIVE", expiresAt: new Date(Date.now() + 100_000) });
    expect(deriveStatus(link)).toBe("ACTIVE");
  });
});

describe("buildShortUrl", () => {
  it("joins the base URL and short code", () => {
    expect(buildShortUrl("abc1234")).toBe(`${process.env.BASE_URL}/abc1234`);
  });
});

describe("toLinkDTO", () => {
  it("maps a Prisma Link to a client-facing DTO with a derived status and shortUrl", () => {
    const dto = toLinkDTO(buildLink());
    expect(dto).toMatchObject({
      id: "clx123",
      title: "Test Link",
      shortCode: "abc1234",
      status: "ACTIVE",
      rawStatus: "ACTIVE",
      clickCount: 5,
    });
    expect(dto.shortUrl).toContain("abc1234");
    expect(dto.expiresAt).toBeNull();
  });
});
