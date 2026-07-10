import { Request } from "express";
import { extractRequestMeta, hashIp } from "../../src/utils/requestMeta";

function buildMockRequest(overrides: Partial<Request> = {}): Request {
  return {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      referer: "https://google.com/search",
      ...overrides.headers,
    },
    // Express resolves `req.ip` from X-Forwarded-For itself once `trust proxy` is
    // configured (see app.ts) — extractRequestMeta trusts that resolved value
    // rather than re-parsing headers, so tests set `ip` directly like Express would.
    ip: "8.8.8.8",
    socket: { remoteAddress: "8.8.8.8" },
    ...overrides,
  } as unknown as Request;
}

describe("extractRequestMeta", () => {
  it("parses browser, os, and device from a desktop Chrome user agent", () => {
    const meta = extractRequestMeta(buildMockRequest());
    expect(meta.browser).toBe("Chrome");
    expect(meta.os).toBe("Windows");
    expect(meta.device).toBe("Desktop");
  });

  it("captures the referrer header", () => {
    const meta = extractRequestMeta(buildMockRequest());
    expect(meta.referrer).toBe("https://google.com/search");
  });

  it("uses Express's resolved req.ip (trust-proxy-aware) for the IP hash", () => {
    const meta = extractRequestMeta(buildMockRequest({ ip: "1.2.3.4" }));
    expect(meta.ipHash).toBe(hashIp("1.2.3.4"));
  });

  it("falls back to the raw socket address when req.ip is unavailable", () => {
    const meta = extractRequestMeta(buildMockRequest({ ip: undefined, socket: { remoteAddress: "9.9.9.9" } } as never));
    expect(meta.ipHash).toBe(hashIp("9.9.9.9"));
  });

  it("returns null referrer when the header is absent", () => {
    const req = buildMockRequest();
    delete (req.headers as Record<string, unknown>).referer;
    const meta = extractRequestMeta(req);
    expect(meta.referrer).toBeNull();
  });
});

describe("hashIp", () => {
  it("produces a deterministic sha256 hex digest", () => {
    const hash = hashIp("8.8.8.8");
    expect(hash).toHaveLength(64);
    expect(hash).toBe(hashIp("8.8.8.8"));
    expect(hash).not.toBe(hashIp("1.1.1.1"));
  });
});
