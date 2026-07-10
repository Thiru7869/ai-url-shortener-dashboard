import request from "supertest";
import { createApp } from "../../src/app";
import { prisma } from "../../src/config/prisma";
import { redis } from "../../src/config/redis";

const app = createApp();

beforeAll(async () => {
  await prisma.$connect();
});

afterEach(async () => {
  await prisma.click.deleteMany();
  await prisma.link.deleteMany();
  await redis.flushdb();
});

afterAll(async () => {
  await prisma.$disconnect();
  redis.disconnect();
});

describe("GET /api/links/:id/analytics", () => {
  it("aggregates total clicks and distributions by browser/os/device/country/referrer", async () => {
    const link = await prisma.link.create({
      data: { title: "Analytics Link", originalUrl: "https://example.com/a", shortCode: "anlytc1" },
    });

    await prisma.click.createMany({
      data: [
        { linkId: link.id, browser: "Chrome", os: "Windows", device: "Desktop", country: "US", referrer: "https://google.com" },
        { linkId: link.id, browser: "Chrome", os: "Windows", device: "Desktop", country: "US", referrer: "https://google.com" },
        { linkId: link.id, browser: "Firefox", os: "Linux", device: "Desktop", country: "IN", referrer: "https://twitter.com" },
        { linkId: link.id, browser: "Safari", os: "iOS", device: "Mobile", country: "GB", referrer: null },
      ],
    });

    const res = await request(app).get(`/api/links/${link.id}/analytics`).query({ days: 30 });

    expect(res.status).toBe(200);
    expect(res.body.data.totalClicks).toBe(4);
    expect(res.body.data.browserDistribution).toEqual(
      expect.arrayContaining([
        { label: "Chrome", count: 2 },
        { label: "Firefox", count: 1 },
        { label: "Safari", count: 1 },
      ]),
    );
    expect(res.body.data.countryDistribution.length).toBe(3);
    expect(res.body.data.dailyClicks.length).toBe(30);
    expect(res.body.data.dailyClicks.reduce((sum: number, d: { count: number }) => sum + d.count, 0)).toBe(4);
    const unknownReferrerEntry = res.body.data.topReferrers.find((r: { label: string }) => r.label === "Unknown");
    expect(unknownReferrerEntry.count).toBe(1);
  });

  it("returns 404 for analytics on a non-existent link", async () => {
    const res = await request(app).get("/api/links/does-not-exist/analytics");
    expect(res.status).toBe(404);
  });

  it("returns zeroed analytics for a link with no clicks", async () => {
    const link = await prisma.link.create({
      data: { title: "No Clicks", originalUrl: "https://example.com/none", shortCode: "noclick1" },
    });

    const res = await request(app).get(`/api/links/${link.id}/analytics`);
    expect(res.status).toBe(200);
    expect(res.body.data.totalClicks).toBe(0);
    expect(res.body.data.browserDistribution).toEqual([]);
  });
});
