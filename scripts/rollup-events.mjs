#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_RETENTION_DAYS = 90;
const MAX_RETENTION_DAYS = 3650;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvFile(relPath) {
  const absPath = path.join(root, relPath);
  if (!existsSync(absPath)) return;

  for (const line of readFileSync(absPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;

    const [, key, rawValue] = match;
    process.env[key] ??= rawValue
      .replace(/\s+#.*$/, "")
      .replace(/^["']|["']$/g, "")
      .trim();
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

function getArgValue(name) {
  const prefix = `--${name}=`;
  const match = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : null;
}

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function parseRetentionDays() {
  const raw =
    getArgValue("retention-days") ??
    process.env.EVENT_RETENTION_DAYS ??
    String(DEFAULT_RETENTION_DAYS);
  const value = Number.parseInt(raw, 10);
  if (!Number.isInteger(value) || value < 1 || value > MAX_RETENTION_DAYS) {
    throw new Error(`retention-days must be an integer between 1 and ${MAX_RETENTION_DAYS}`);
  }
  return value;
}

async function main() {
  const retentionDays = parseRetentionDays();
  const supabaseUrl = requiredEnv("NEXT_PUBLIC_SUPABASE_URL").replace(/\/+$/, "");
  const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");

  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/rollup_expired_events`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ retention_days: retentionDays }),
  });

  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  if (!response.ok) {
    throw new Error(
      `event rollup failed (${response.status}): ${JSON.stringify(payload)}`,
    );
  }

  console.log(JSON.stringify(payload, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
