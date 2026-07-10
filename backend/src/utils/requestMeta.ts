import { createHash } from "crypto";
import { Request } from "express";
import { UAParser } from "ua-parser-js";
import geoip from "geoip-lite";

export interface RequestMeta {
  browser: string | null;
  os: string | null;
  device: string | null;
  country: string | null;
  referrer: string | null;
  ipHash: string | null;
}

function resolveClientIp(req: Request): string | null {
  // req.ip honors Express's `trust proxy` setting (app.ts sets it to trust exactly
  // one hop), so this resolves safely from X-Forwarded-For behind our reverse proxy
  // instead of trusting a client-spoofable header directly.
  return req.ip ?? req.socket.remoteAddress ?? null;
}

export function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex");
}

export function extractRequestMeta(req: Request): RequestMeta {
  const userAgent = req.headers["user-agent"] ?? "";
  const parser = new UAParser(userAgent);
  const browser = parser.getBrowser().name ?? null;
  const os = parser.getOS().name ?? null;
  const deviceType = parser.getDevice().type;
  const device = deviceType ? deviceType.charAt(0).toUpperCase() + deviceType.slice(1) : "Desktop";

  const ip = resolveClientIp(req);
  let country: string | null = null;
  if (ip) {
    const geo = geoip.lookup(ip);
    country = geo?.country ?? null;
  }

  const referrer = (req.headers["referer"] as string | undefined) ?? null;

  return {
    browser,
    os,
    device,
    country,
    referrer,
    ipHash: ip ? hashIp(ip) : null,
  };
}
