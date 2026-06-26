import { expect, test } from "@playwright/test";
import { createConnection } from "node:net";

const securityHeaders = {
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": /camera=\(\).*microphone=\(\).*geolocation=\(\).*payment=\(\)/,
  "cross-origin-opener-policy": "same-origin",
  "origin-agent-cluster": "?1",
  "x-dns-prefetch-control": "off",
};

const cspDirectives = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "connect-src 'self' https: wss:",
  "frame-src https://www.youtube.com https://www.youtube-nocookie.com",
];

test("public landing page renders and carries security headers", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.ok()).toBe(true);

  const headers = response?.headers() ?? {};
  expect(headers["x-content-type-options"]).toBe(securityHeaders["x-content-type-options"]);
  expect(headers["x-frame-options"]).toBe(securityHeaders["x-frame-options"]);
  expect(headers["referrer-policy"]).toBe(securityHeaders["referrer-policy"]);
  expect(headers["permissions-policy"]).toMatch(securityHeaders["permissions-policy"]);
  expect(headers["cross-origin-opener-policy"]).toBe(
    securityHeaders["cross-origin-opener-policy"],
  );
  expect(headers["origin-agent-cluster"]).toBe(securityHeaders["origin-agent-cluster"]);
  expect(headers["x-dns-prefetch-control"]).toBe(securityHeaders["x-dns-prefetch-control"]);
  for (const directive of cspDirectives) {
    expect(headers["content-security-policy"]).toContain(directive);
  }

  await expect(page).toHaveTitle(/한림 MICE 동문/);
  await expect(page.getByRole("heading", { name: "흩어진 동문을, 다시 잇다." })).toBeVisible();
  await expect(page.getByRole("link", { name: "지금 시작하기" })).toHaveCount(2);
});

test("protected app route redirects anonymous users to login", async ({ page, request }) => {
  const redirect = await request.get("/home", { maxRedirects: 0 });
  expect([307, 308]).toContain(redirect.status());
  expect(redirect.headers()["location"]).toContain("/login?next=%2Fhome");
  expect(redirect.headers()["cache-control"]).toContain("no-store");
  expect(redirect.headers()["vary"]).toContain("Cookie");

  await page.goto("/home");

  await expect(page).toHaveURL(/\/login\?next=%2Fhome$/);
  await expect(page.getByRole("button", { name: /Google/ })).toBeVisible();
});

test("authenticated API endpoints reject anonymous mutation and reads", async ({ request }) => {
  const mutation = await request.post("/api/events", {
    data: { eventType: "profile_view", targetId: "00000000-0000-4000-8000-000000000000" },
  });
  expect(mutation.status()).toBe(401);
  expect(mutation.headers()["cache-control"]).toContain("no-store");
  expect(mutation.headers()["vary"]).toContain("Cookie");
  await expectJson(mutation, { error: "로그인이 필요합니다." });

  const read = await request.get("/api/profiles");
  expect(read.status()).toBe(401);
  expect(read.headers()["cache-control"]).toContain("no-store");
  expect(read.headers()["vary"]).toContain("Cookie");
  await expectJson(read, { error: "로그인이 필요합니다." });
});

test("cross-site mutation is rejected before auth lookup", async ({ request }) => {
  const response = await request.post("/api/events", {
    data: { eventType: "profile_view" },
    headers: {
      origin: "https://attacker.example",
      "sec-fetch-site": "cross-site",
    },
  });

  expect(response.status()).toBe(403);
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect(response.headers()["vary"]).toContain("Cookie");
  await expectJson(response, { error: "허용되지 않은 요청입니다." });
});

test("loopback origin aliases reach auth instead of CSRF rejection", async ({ request }) => {
  const response = await request.post("/api/events", {
    data: { eventType: "profile_view" },
    headers: {
      origin: loopbackAliasOrigin(),
      "sec-fetch-site": "same-origin",
    },
  });

  expect(response.status()).toBe(401);
  await expectJson(response, { error: "로그인이 필요합니다." });
});

test("mutating APIs reject invalid request bodies before auth lookup", async ({ request }) => {
  const unsupportedHeaderOnly = await request.fetch("/api/events", {
    method: "POST",
    headers: { "content-type": "text/plain" },
  });
  expect(unsupportedHeaderOnly.status()).toBe(415);
  expect(unsupportedHeaderOnly.headers()["cache-control"]).toContain("no-store");
  await expectJson(unsupportedHeaderOnly, { error: "JSON 요청만 처리할 수 있어요." });

  const missingContentType = await request.fetch("/api/events", {
    method: "POST",
    data: "eventType=profile_view",
    headers: {},
  });
  expect(missingContentType.status()).toBe(415);
  expect(missingContentType.headers()["cache-control"]).toContain("no-store");
  await expectJson(missingContentType, { error: "JSON 요청만 처리할 수 있어요." });

  const unsupported = await request.post("/api/events", {
    data: "eventType=profile_view",
    headers: { "content-type": "text/plain" },
  });
  expect(unsupported.status()).toBe(415);
  expect(unsupported.headers()["cache-control"]).toContain("no-store");
  await expectJson(unsupported, { error: "JSON 요청만 처리할 수 있어요." });

  const oversized = await request.post("/api/events", {
    data: `"${"x".repeat(1024 * 1024)}"`,
    headers: { "content-type": "application/json" },
  });
  expect(oversized.status()).toBe(413);
  expect(oversized.headers()["cache-control"]).toContain("no-store");
  await expectJson(oversized, { error: "요청 본문이 너무 큽니다." });
});

test("mutating APIs bound chunked JSON bodies before auth lookup", async () => {
  const body = `"${"x".repeat(1024 * 1024)}"`;
  const response = await sendRawHttpRequest(
    [
      "POST /api/events HTTP/1.1",
      `Host: ${baseHostHeader()}`,
      "Content-Type: application/json",
      "Transfer-Encoding: chunked",
      "Connection: close",
      "",
      body.length.toString(16),
      body,
      "0",
      "",
      "",
    ].join("\r\n"),
  );

  expect(response).toContain(" 413 ");
  expect(response).toContain('"error":"요청 본문이 너무 큽니다."');
});

async function expectJson(response: { json: () => Promise<unknown> }, expected: unknown) {
  await expect(response.json()).resolves.toEqual(expected);
}

function baseURL(): URL {
  return new URL(process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000");
}

function baseHostHeader(): string {
  const url = baseURL();
  return url.port ? `${url.hostname}:${url.port}` : url.hostname;
}

function loopbackAliasOrigin(): string {
  const url = baseURL();
  const aliasHost = url.hostname === "localhost" ? "127.0.0.1" : "localhost";
  return `${url.protocol}//${url.port ? `${aliasHost}:${url.port}` : aliasHost}`;
}

function sendRawHttpRequest(payload: string): Promise<string> {
  const url = baseURL();
  const port = url.port ? Number(url.port) : url.protocol === "https:" ? 443 : 80;

  return new Promise((resolve, reject) => {
    const socket = createConnection({ host: url.hostname, port });
    let response = "";

    socket.setEncoding("utf8");
    socket.setTimeout(10_000);
    socket.on("connect", () => {
      socket.write(payload);
    });
    socket.on("data", (chunk) => {
      response += chunk;
    });
    socket.on("end", () => resolve(response));
    socket.on("timeout", () => {
      socket.destroy(new Error("raw HTTP request timed out"));
    });
    socket.on("error", reject);
  });
}
