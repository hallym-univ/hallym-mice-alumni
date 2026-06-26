const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

export function isSameOriginOrLoopbackAlias(
  candidate: string,
  expected: string,
): boolean {
  const candidateUrl = parseUrl(candidate);
  const expectedUrl = parseUrl(expected);
  if (!candidateUrl || !expectedUrl) return false;
  if (candidateUrl.origin === expectedUrl.origin) return true;

  return (
    candidateUrl.protocol === expectedUrl.protocol &&
    effectivePort(candidateUrl) === effectivePort(expectedUrl) &&
    isLoopbackHost(candidateUrl.hostname) &&
    isLoopbackHost(expectedUrl.hostname)
  );
}

export function toOrigin(value: string): string | null {
  const url = parseUrl(value);
  return url?.origin ?? null;
}

function parseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function effectivePort(url: URL): string {
  if (url.port) return url.port;
  return url.protocol === "https:" ? "443" : "80";
}

function isLoopbackHost(hostname: string): boolean {
  return LOOPBACK_HOSTS.has(hostname.toLowerCase());
}
