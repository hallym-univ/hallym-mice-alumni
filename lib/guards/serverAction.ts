import "server-only";

import { headers } from "next/headers";

import { publicEnv } from "@/lib/env";

const ALLOWED_FETCH_SITES = new Set(["same-origin", "same-site"]);

export class ServerActionSecurityError extends Error {
  constructor(message = "허용되지 않은 요청입니다.") {
    super(message);
    this.name = "ServerActionSecurityError";
  }
}

export async function assertServerActionRequest(): Promise<void> {
  const h = await headers();
  const secFetchSite = h.get("sec-fetch-site")?.toLowerCase();
  if (secFetchSite && !ALLOWED_FETCH_SITES.has(secFetchSite)) {
    throw new ServerActionSecurityError();
  }

  const origin = h.get("origin");
  if (!origin) return;

  const allowedOrigins = allowedRequestOrigins(h);
  const requestOrigin = toOrigin(origin);
  if (!requestOrigin || !allowedOrigins.has(requestOrigin)) {
    throw new ServerActionSecurityError();
  }
}

function allowedRequestOrigins(h: Headers): Set<string> {
  const proto = h.get("x-forwarded-proto") ?? null;
  const hosts = [h.get("host"), h.get("x-forwarded-host")].filter(
    (host): host is string => Boolean(host),
  );

  const origins = new Set<string>();
  for (const host of hosts) {
    const origin = originFromHost(host, proto);
    if (origin) origins.add(origin);
  }

  const siteOrigin = toOrigin(publicEnv.siteUrl);
  if (siteOrigin) origins.add(siteOrigin);
  return origins;
}

function originFromHost(host: string, proto: string | null): string | null {
  const trimmedHost = host.trim();
  if (!trimmedHost) return null;
  const scheme = proto ?? (isLocalHost(trimmedHost) ? "http" : "https");
  return toOrigin(`${scheme}://${trimmedHost}`);
}

function isLocalHost(host: string): boolean {
  const hostname = host.split(":")[0]?.toLowerCase();
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function toOrigin(value: string): string | null {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}
