import { createLinkSchema, listLinksQuerySchema, updateStatusSchema } from "../../src/validators/link.validators";

describe("createLinkSchema", () => {
  it("accepts a minimal valid payload", () => {
    const result = createLinkSchema.safeParse({ title: "My Link", originalUrl: "https://example.com" });
    expect(result.success).toBe(true);
  });

  it("rejects a non-http(s) URL", () => {
    const result = createLinkSchema.safeParse({ title: "Bad", originalUrl: "javascript:alert(1)" });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed URL", () => {
    const result = createLinkSchema.safeParse({ title: "Bad", originalUrl: "not-a-url" });
    expect(result.success).toBe(false);
  });

  it("rejects a missing title", () => {
    const result = createLinkSchema.safeParse({ originalUrl: "https://example.com" });
    expect(result.success).toBe(false);
  });

  it("rejects a custom alias with invalid characters", () => {
    const result = createLinkSchema.safeParse({
      title: "My Link",
      originalUrl: "https://example.com",
      customAlias: "bad alias!",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid custom alias", () => {
    const result = createLinkSchema.safeParse({
      title: "My Link",
      originalUrl: "https://example.com",
      customAlias: "my-campaign_2026",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an expiry date in the past", () => {
    const result = createLinkSchema.safeParse({
      title: "My Link",
      originalUrl: "https://example.com",
      expiresAt: new Date(Date.now() - 86_400_000).toISOString(),
    });
    expect(result.success).toBe(false);
  });

  it("accepts an expiry date in the future", () => {
    const result = createLinkSchema.safeParse({
      title: "My Link",
      originalUrl: "https://example.com",
      expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    });
    expect(result.success).toBe(true);
  });
});

describe("listLinksQuerySchema", () => {
  it("applies default pagination", () => {
    const result = listLinksQuerySchema.parse({});
    expect(result).toEqual({ page: 1, limit: 10 });
  });

  it("coerces string query params to numbers", () => {
    const result = listLinksQuerySchema.parse({ page: "3", limit: "25" });
    expect(result.page).toBe(3);
    expect(result.limit).toBe(25);
  });

  it("rejects a limit above the maximum", () => {
    const result = listLinksQuerySchema.safeParse({ limit: "500" });
    expect(result.success).toBe(false);
  });
});

describe("updateStatusSchema", () => {
  it("only accepts ACTIVE or DISABLED", () => {
    expect(updateStatusSchema.safeParse({ status: "ACTIVE" }).success).toBe(true);
    expect(updateStatusSchema.safeParse({ status: "DISABLED" }).success).toBe(true);
    expect(updateStatusSchema.safeParse({ status: "DELETED" }).success).toBe(false);
  });
});
