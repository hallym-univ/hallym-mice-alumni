import { expect, test } from "@playwright/test";

const securityHeaders = {
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": /camera=\(\).*microphone=\(\).*geolocation=\(\).*payment=\(\)/,
  "cross-origin-opener-policy": "same-origin",
  "origin-agent-cluster": "?1",
  "x-dns-prefetch-control": "off",
};

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

  await expect(page).toHaveTitle(/한림 MICE 동문/);
  await expect(page.getByRole("heading", { name: "흩어진 동문을, 다시 잇다." })).toBeVisible();
  await expect(page.getByRole("link", { name: "지금 시작하기" })).toHaveCount(2);
});

test("protected app route redirects anonymous users to login", async ({ page }) => {
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
  await expectJson(mutation, { error: "로그인이 필요합니다." });

  const read = await request.get("/api/profiles");
  expect(read.status()).toBe(401);
  expect(read.headers()["cache-control"]).toContain("no-store");
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
  await expectJson(response, { error: "허용되지 않은 요청입니다." });
});

async function expectJson(response: { json: () => Promise<unknown> }, expected: unknown) {
  await expect(response.json()).resolves.toEqual(expected);
}
