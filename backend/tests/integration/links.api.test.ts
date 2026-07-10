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

async function createLink(overrides: Record<string, unknown> = {}) {
  return request(app)
    .post("/api/links")
    .send({ title: "My Link", originalUrl: "https://example.com/page", ...overrides });
}

describe("POST /api/links", () => {
  it("creates a link with an auto-generated short code", async () => {
    const res = await createLink();
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.shortCode).toHaveLength(7);
    expect(res.body.data.status).toBe("ACTIVE");
    expect(res.body.data.isCustomAlias).toBe(false);
  });

  it("creates a link with a custom alias", async () => {
    const res = await createLink({ customAlias: "my-alias" });
    expect(res.status).toBe(201);
    expect(res.body.data.shortCode).toBe("my-alias");
    expect(res.body.data.isCustomAlias).toBe(true);
  });

  it("returns 409 when the custom alias is already taken", async () => {
    await createLink({ customAlias: "dupe-alias" });
    const res = await createLink({ customAlias: "dupe-alias", title: "Second" });
    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toMatch(/already in use/i);
  });

  it("rejects an invalid URL with 400", async () => {
    const res = await createLink({ originalUrl: "not-a-url" });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("rejects a missing title with 400", async () => {
    const res = await request(app).post("/api/links").send({ originalUrl: "https://example.com" });
    expect(res.status).toBe(400);
  });

  it("rejects an expiry date in the past", async () => {
    const res = await createLink({ expiresAt: new Date(Date.now() - 100_000).toISOString() });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/links", () => {
  it("lists links with pagination metadata", async () => {
    await createLink({ title: "Alpha" });
    await createLink({ title: "Beta" });

    const res = await request(app).get("/api/links").query({ page: 1, limit: 10 });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta.pagination).toMatchObject({ page: 1, limit: 10, total: 2 });
  });

  it("respects pagination limits", async () => {
    for (let i = 0; i < 5; i += 1) {
      await createLink({ title: `Link ${i}` });
    }
    const res = await request(app).get("/api/links").query({ page: 2, limit: 2 });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta.pagination.totalPages).toBe(3);
  });

  it("searches by title", async () => {
    await createLink({ title: "Summer Campaign" });
    await createLink({ title: "Winter Campaign" });

    const res = await request(app).get("/api/links").query({ search: "Summer" });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].title).toBe("Summer Campaign");
  });

  it("searches by original URL", async () => {
    await createLink({ title: "A", originalUrl: "https://example.com/unique-path-xyz" });
    await createLink({ title: "B", originalUrl: "https://example.com/other" });

    const res = await request(app).get("/api/links").query({ search: "unique-path-xyz" });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it("excludes soft-deleted links", async () => {
    const created = await createLink();
    await request(app).delete(`/api/links/${created.body.data.id}`);

    const res = await request(app).get("/api/links");
    expect(res.body.data).toHaveLength(0);
  });
});

describe("GET /api/links/:id", () => {
  it("returns link details", async () => {
    const created = await createLink();
    const res = await request(app).get(`/api/links/${created.body.data.id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(created.body.data.id);
  });

  it("returns 404 for an unknown id", async () => {
    const res = await request(app).get("/api/links/does-not-exist");
    expect(res.status).toBe(404);
  });
});

describe("PUT /api/links/:id", () => {
  it("updates title and original URL", async () => {
    const created = await createLink();
    const res = await request(app)
      .put(`/api/links/${created.body.data.id}`)
      .send({ title: "Updated Title", originalUrl: "https://example.com/updated" });

    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe("Updated Title");
    expect(res.body.data.originalUrl).toBe("https://example.com/updated");
  });
});

describe("PATCH /api/links/:id/status", () => {
  it("disables and re-enables a link", async () => {
    const created = await createLink();
    const id = created.body.data.id;

    const disableRes = await request(app).patch(`/api/links/${id}/status`).send({ status: "DISABLED" });
    expect(disableRes.status).toBe(200);
    expect(disableRes.body.data.status).toBe("DISABLED");

    const enableRes = await request(app).patch(`/api/links/${id}/status`).send({ status: "ACTIVE" });
    expect(enableRes.status).toBe(200);
    expect(enableRes.body.data.status).toBe("ACTIVE");
  });
});

describe("DELETE /api/links/:id", () => {
  it("soft deletes a link (record remains in DB with deletedAt set)", async () => {
    const created = await createLink();
    const id = created.body.data.id;

    const res = await request(app).delete(`/api/links/${id}`);
    expect(res.status).toBe(200);

    const dbRecord = await prisma.link.findUnique({ where: { id } });
    expect(dbRecord).not.toBeNull();
    expect(dbRecord?.deletedAt).not.toBeNull();

    const getRes = await request(app).get(`/api/links/${id}`);
    expect(getRes.status).toBe(404);
  });
});

describe("GET /api/dashboard/stats", () => {
  it("aggregates total, active, and expired link counts", async () => {
    await createLink({ title: "Active One" });
    await createLink({ title: "Expiring Soon", expiresAt: new Date(Date.now() + 60_000).toISOString() });
    const expired = await prisma.link.create({
      data: {
        title: "Already Expired",
        originalUrl: "https://example.com/expired",
        shortCode: "expired1",
        expiresAt: new Date(Date.now() - 60_000),
      },
    });

    const res = await request(app).get("/api/dashboard/stats");
    expect(res.status).toBe(200);
    expect(res.body.data.totalLinks).toBe(3);
    expect(res.body.data.expiredLinks).toBe(1);
    expect(res.body.data.activeLinks).toBe(2);
    expect(expired.id).toBeTruthy();
  });
});
