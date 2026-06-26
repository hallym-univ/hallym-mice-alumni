import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

function read(relPath) {
  return readFileSync(path.join(root, relPath), "utf8");
}

function walk(relDir) {
  const absDir = path.join(root, relDir);
  if (!existsSync(absDir)) return [];
  const out = [];
  for (const entry of readdirSync(absDir)) {
    if (entry === "node_modules" || entry === ".next" || entry === ".git") continue;
    const rel = path.join(relDir, entry);
    const abs = path.join(root, rel);
    const stat = statSync(abs);
    if (stat.isDirectory()) out.push(...walk(rel));
    else out.push(rel.split(path.sep).join("/"));
  }
  return out;
}

function addFailure(message) {
  failures.push(message);
}

function importsOf(source) {
  const imports = [];
  const importRe =
    /import\s+(?:type\s+)?(?:[^'"()]*?\s+from\s+)?["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)/g;
  let match;
  while ((match = importRe.exec(source))) imports.push(match[1] ?? match[2]);
  return imports;
}

function isUseClientFile(source) {
  const stripped = source
    .replace(/^\uFEFF/, "")
    .replace(/^\s*\/\*[\s\S]*?\*\//, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .trimStart();
  return stripped.startsWith('"use client"') || stripped.startsWith("'use client'");
}

function resolveImport(relFile, specifier) {
  if (specifier === "server-only") return "server-only";
  if (specifier.startsWith("@/")) return path.join(root, specifier.slice(2));
  if (specifier.startsWith(".")) {
    return path.resolve(path.join(root, path.dirname(relFile)), specifier);
  }
  return null;
}

function pointsAt(absTarget, relSensitive) {
  if (!absTarget) return false;
  const sensitive = path.join(root, relSensitive);
  return absTarget === sensitive || absTarget.startsWith(`${sensitive}${path.sep}`);
}

function checkNoClientSecretImports(files) {
  const sensitive = [
    "lib/supabase/admin",
    "lib/storage",
    "lib/server-env",
    "lib/rate-limit",
  ];

  for (const rel of files.filter((f) => /\.(ts|tsx)$/.test(f))) {
    const source = read(rel);
    if (!isUseClientFile(source)) continue;

    for (const specifier of importsOf(source)) {
      const resolved = resolveImport(rel, specifier);
      if (specifier === "server-only") {
        addFailure(`${rel}: client file imports server-only`);
        continue;
      }
      if (sensitive.some((item) => pointsAt(resolved, item))) {
        addFailure(`${rel}: client file imports server-only module "${specifier}"`);
      }
    }
  }
}

function checkSensitiveLibsAreServerOnly(files) {
  const sensitiveImportRe =
    /@\/lib\/supabase\/admin|@\/lib\/storage|@\/lib\/server-env/;
  for (const rel of files.filter((f) => f.startsWith("lib/") && /\.(ts|tsx)$/.test(f))) {
    const source = read(rel);
    const isSensitiveEntrypoint =
      rel === "lib/supabase/admin.ts" ||
      rel === "lib/storage/index.ts" ||
      rel === "lib/server-env.ts";
    if ((isSensitiveEntrypoint || sensitiveImportRe.test(source)) && !source.includes('import "server-only"')) {
      addFailure(`${rel}: sensitive server module must import "server-only"`);
    }
  }
}

function checkApiRoutes() {
  const apiRoutes = walk("app/api").filter((f) => f.endsWith("/route.ts"));
  const publicUnauthedGet = new Set(["app/api/health/route.ts"]);

  for (const rel of apiRoutes) {
    const source = read(rel);
    const hasMutation = /export\s+const\s+(POST|PUT|PATCH|DELETE)\s*=/.test(source);
    const usesAdminClient = source.includes("createAdminClient(");
    const usesWithAuth = /withAuth(?:<[^>]+>)?\(/.test(source);

    if (hasMutation && !usesWithAuth) {
      addFailure(`${rel}: mutating API route must use withAuth`);
    }
    if (usesAdminClient && !usesWithAuth && !publicUnauthedGet.has(rel)) {
      addFailure(`${rel}: admin client access must be behind withAuth`);
    }
    if (rel.includes("[") && !source.includes("resolveRouteUuidParam(")) {
      addFailure(`${rel}: dynamic API route id must be validated with resolveRouteUuidParam`);
    }
  }
}

function checkSecurityHeaders() {
  const source = read("next.config.mjs");
  for (const header of [
    "Content-Security-Policy",
    "X-Content-Type-Options",
    "X-Frame-Options",
    "Referrer-Policy",
    "Permissions-Policy",
    "Cross-Origin-Opener-Policy",
    "Origin-Agent-Cluster",
    "X-DNS-Prefetch-Control",
    "Strict-Transport-Security",
  ]) {
    if (!source.includes(header)) addFailure(`next.config.mjs: missing ${header}`);
  }
  if (!source.includes("Cache-Control") || !source.includes("no-store")) {
    addFailure("next.config.mjs: API responses must opt out of shared caching");
  }
  for (const directive of [
    "default-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "connect-src 'self' https: wss:",
  ]) {
    if (!source.includes(directive)) {
      addFailure(`next.config.mjs: CSP missing ${directive}`);
    }
  }
}

function checkSupabaseCookiePolicy() {
  const cookiePolicy = read("lib/supabase/cookies.ts");
  for (const fragment of [
    'path: "/"',
    'sameSite: "lax"',
    'process.env.NODE_ENV === "production"',
    "httpOnly: false",
  ]) {
    if (!cookiePolicy.includes(fragment)) {
      addFailure(`lib/supabase/cookies.ts: missing explicit Supabase auth cookie policy fragment ${fragment}`);
    }
  }

  for (const rel of ["middleware.ts", "lib/supabase/server.ts", "lib/supabase/client.ts"]) {
    const source = read(rel);
    if (!source.includes("supabaseCookieOptions")) {
      addFailure(`${rel}: Supabase client must use explicit cookieOptions`);
    }
  }
}

function checkApiMutationBodyGuard() {
  const source = read("lib/guards/withAuth.ts");
  for (const fragment of [
    "MAX_MUTATION_BODY_BYTES",
    "content-length",
    "isJsonContentType",
    "jsonError(413",
    "jsonError(415",
    "rejectInvalidMutationBody(req)",
  ]) {
    if (!source.includes(fragment)) {
      addFailure(`lib/guards/withAuth.ts: missing mutation request body guard fragment ${fragment}`);
    }
  }
}

function checkProtectedRouteCachePolicy() {
  const source = read("middleware.ts");
  for (const fragment of [
    "PROTECTED_ROUTE_CACHE_CONTROL",
    '"no-store, private"',
    '"Cache-Control"',
    '"Vary"',
    '"Cookie"',
    "withProtectedRouteHeaders",
  ]) {
    if (!source.includes(fragment)) {
      addFailure(`middleware.ts: missing protected route cache policy fragment ${fragment}`);
    }
  }
}

function checkExternalLinks(files) {
  for (const rel of files.filter((f) => /\.(ts|tsx)$/.test(f))) {
    const source = read(rel);
    const targetBlankRe = /target=["']_blank["']/g;
    let match;
    while ((match = targetBlankRe.exec(source))) {
      const tagStart = source.lastIndexOf("<", match.index);
      const tagEnd = source.indexOf(">", match.index);
      const chunk =
        tagStart >= 0 && tagEnd >= 0
          ? source.slice(tagStart, tagEnd + 1)
          : source.slice(match.index, match.index + 250);
      if (!/rel=["'][^"']*noopener/.test(chunk)) {
        addFailure(`${rel}: target="_blank" must include rel="noopener noreferrer"`);
      }
    }

    const windowOpenRe = /window\.open\(([^)]*)\)/g;
    while ((match = windowOpenRe.exec(source))) {
      if (!match[1].includes("noopener")) {
        addFailure(`${rel}: window.open must include noopener in features`);
      }
    }
  }
}

function checkNoDangerousHtml(files) {
  for (const rel of files.filter((f) => /\.(ts|tsx)$/.test(f))) {
    const source = read(rel);
    if (source.includes("dangerouslySetInnerHTML")) {
      addFailure(`${rel}: dangerouslySetInnerHTML requires an explicit security review`);
    }
  }
}

function checkEnvFiles() {
  const trackedEnv = execFileSync("git", ["ls-files", ".env", ".env.local", ".vercel"], {
    cwd: root,
    encoding: "utf8",
  })
    .split("\n")
    .filter(Boolean);
  if (trackedEnv.length > 0) {
    addFailure(`secret env files are tracked by git: ${trackedEnv.join(", ")}`);
  }

  const example = read(".env.example");
  for (const name of [
    "SUPABASE_SERVICE_ROLE_KEY",
    "RESEND_API_KEY",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
  ]) {
    const match = example.match(new RegExp(`^${name}=([^#\\n]*)`, "m"));
    if (match?.[1]?.trim()) {
      addFailure(`.env.example: ${name} must not contain a real value`);
    }
  }
}

function checkBuildArtifacts() {
  const clientDirs = [".next/static"].filter((dir) => existsSync(path.join(root, dir)));
  const serverDirs = [".next/server"].filter((dir) => existsSync(path.join(root, dir)));
  if (clientDirs.length === 0 && serverDirs.length === 0) return;

  const sensitiveMarkers = [
    "SUPABASE_SERVICE_ROLE_KEY",
    "R2_SECRET_ACCESS_KEY",
    "R2_ACCESS_KEY_ID",
    "RESEND_API_KEY",
  ];

  const sensitiveValues = loadSensitiveEnvValues();
  const clientFiles = clientDirs.flatMap(walk);
  scanBuildFiles(clientFiles, sensitiveMarkers, "client build artifact");

  const buildFiles = [...clientFiles, ...serverDirs.flatMap(walk)];
  scanBuildFiles(
    buildFiles,
    sensitiveValues.map((item) => item.value),
    "build artifact",
    sensitiveValues,
  );
}

function scanBuildFiles(files, needles, label, namedNeedles = []) {
  if (needles.length === 0) return;
  for (const rel of files) {
    const abs = path.join(root, rel);
    const stat = statSync(abs);
    if (stat.size > 5 * 1024 * 1024) continue;

    let source;
    try {
      source = readFileSync(abs, "utf8");
    } catch {
      continue;
    }
    for (const needle of needles) {
      if (source.includes(needle)) {
        const named = namedNeedles.find((item) => item.value === needle);
        const display = named ? named.name : needle;
        addFailure(`${rel}: ${label} contains sensitive marker "${display}"`);
      }
    }
  }
}

function loadSensitiveEnvValues() {
  const env = { ...process.env };
  for (const rel of [".env.local", ".vercel/.env.production.local"]) {
    const abs = path.join(root, rel);
    if (!existsSync(abs)) continue;
    const source = readFileSync(abs, "utf8");
    for (const line of source.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!match) continue;
      const [, key, rawValue] = match;
      env[key] = rawValue
        .replace(/\s+#.*$/, "")
        .replace(/^["']|["']$/g, "")
        .trim();
    }
  }

  return [
    "SUPABASE_SERVICE_ROLE_KEY",
    "RESEND_API_KEY",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
  ]
    .map((name) => ({ name, value: env[name] ?? "" }))
    .filter((item) => item.value.length >= 8);
}

const files = [...walk("app"), ...walk("components"), ...walk("lib")];

checkNoClientSecretImports(files);
checkSensitiveLibsAreServerOnly(files);
checkApiRoutes();
checkSecurityHeaders();
checkSupabaseCookiePolicy();
checkApiMutationBodyGuard();
checkProtectedRouteCachePolicy();
checkExternalLinks(files);
checkNoDangerousHtml(files);
checkEnvFiles();
checkBuildArtifacts();

if (failures.length > 0) {
  console.error("Security check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Security check passed.");
