import request from "supertest";
import { createApp } from "../../src/app";
import { prisma } from "../../src/config/prisma";
import { redis } from "../../src/config/redis";

const app = createApp();

async function waitFor(predicate: () => Promise<boolean>, timeoutMs = 3000, intervalMs = 50): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error("waitFor timed out");
}

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

describe("GET /:shortCode (redirect)", () => {
  it("redirects to the original URL with a 302", async () => {
    const created = await request(app)
      .post("/api/links")
      .send({ title: "Redirect Test", originalUrl: "https://example.com/target-page" });

    const shortCode = created.body.data.shortCode;
    const res = await request(app).get(`/${shortCode}`);

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("https://example.com/target-page");
  });

  it("records a click asynchronously with browser/os/device/referrer metadata", async () => {
    const created = await request(app)
      .post("/api/links")
      .send({ title: "Click Tracking", originalUrl: "https://example.com/tracked" });
    const linkId = created.body.data.id;
    const shortCode = created.body.data.shortCode;

    await request(app)
      .get(`/${shortCode}`)
      .set(
        "User-Agent",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
      )
      .set("Referer", "https://twitter.com/some-post");

    await waitFor(async () => (await prisma.click.count({ where: { linkId } })) === 1);

    const click = await prisma.click.findFirstOrThrow({ where: { linkId } });
    expect(click.browser).toBe("Chrome");
    expect(click.os).toBe("Windows");
    expect(click.referrer).toBe("https://twitter.com/some-post");

    const updatedLink = await prisma.link.findUniqueOrThrow({ where: { id: linkId } });
    expect(updatedLink.clickCount).toBe(1);
  });

  it("returns 404 for an unknown short code", async () => {
    const res = await request(app).get("/does-not-exist-code");
    expect(res.status).toBe(404);
  });

  it("returns 410 for a disabled link and does not redirect", async () => {
    const created = await request(app)
      .post("/api/links")
      .send({ title: "Disabled Test", originalUrl: "https://example.com/disabled" });
    await request(app).patch(`/api/links/${created.body.data.id}/status`).send({ status: "DISABLED" });

    const res = await request(app).get(`/${created.body.data.shortCode}`);
    expect(res.status).toBe(410);
  });

  it("returns 410 for an expired link", async () => {
    const link = await prisma.link.create({
      data: {
        title: "Expired",
        originalUrl: "https://example.com/expired-target",
        shortCode: "expcode1",
        expiresAt: new Date(Date.now() - 60_000),
      },
    });

    const res = await request(app).get(`/${link.shortCode}`);
    expect(res.status).toBe(410);
  });

  it("serves subsequent requests from the Redis cache", async () => {
    const created = await request(app)
      .post("/api/links")
      .send({ title: "Cache Test", originalUrl: "https://example.com/cached" });
    const shortCode = created.body.data.shortCode;

    await request(app).get(`/${shortCode}`);
    const cached = await redis.get(`link:code:${shortCode}`);
    expect(cached).not.toBeNull();

    const res = await request(app).get(`/${shortCode}`);
    expect(res.status).toBe(302);
  });

  it("invalidates the cache when a link is disabled after being cached", async () => {
    const created = await request(app)
      .post("/api/links")
      .send({ title: "Invalidate Test", originalUrl: "https://example.com/invalidate" });
    const id = created.body.data.id;
    const shortCode = created.body.data.shortCode;

    await request(app).get(`/${shortCode}`); // populate cache
    await request(app).patch(`/api/links/${id}/status`).send({ status: "DISABLED" });

    const res = await request(app).get(`/${shortCode}`);
    expect(res.status).toBe(410);
  });
});
