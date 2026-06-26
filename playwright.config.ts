import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL:
        process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY:
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "local-anon-key",
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? baseURL,
      NEXT_PUBLIC_R2_PUBLIC_BASE_URL:
        process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL ?? "https://cdn.example.com",
      SUPABASE_SERVICE_ROLE_KEY:
        process.env.SUPABASE_SERVICE_ROLE_KEY ?? "local-service-key",
      RESEND_API_KEY: process.env.RESEND_API_KEY ?? "",
      ADMIN_EMAILS: process.env.ADMIN_EMAILS ?? "ci-admin@example.com",
      R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID ?? "local-account",
      R2_BUCKET: process.env.R2_BUCKET ?? "local-bucket",
      R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID ?? "local-access-key",
      R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY ?? "local-secret-key",
    },
  },
});
