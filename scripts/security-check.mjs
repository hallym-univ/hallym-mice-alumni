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

function trackedFiles() {
  return execFileSync("git", ["ls-files"], {
    cwd: root,
    encoding: "utf8",
  })
    .split("\n")
    .filter(Boolean)
    .map((rel) => rel.split(path.sep).join("/"));
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

function checkPublicAssetUrlPolicy() {
  const policy = read("lib/public-url.ts");
  for (const fragment of [
    "normalizeHttpsPublicBaseUrl",
    "joinPublicAssetUrl",
    'url.protocol !== "https:"',
    "url.username",
    "url.password",
  ]) {
    if (!policy.includes(fragment)) {
      addFailure(`lib/public-url.ts: missing public asset URL policy fragment ${fragment}`);
    }
  }

  const nextConfig = read("next.config.mjs");
  for (const fragment of [
    "r2RemotePatterns",
    'url.protocol !== "https:"',
    'protocol: "https"',
    "url.username",
    "url.password",
  ]) {
    if (!nextConfig.includes(fragment)) {
      addFailure(`next.config.mjs: R2 remotePatterns must be HTTPS-only (${fragment})`);
    }
  }

  for (const rel of ["lib/utils.ts", "lib/storage/index.ts"]) {
    const source = read(rel);
    if (!source.includes("joinPublicAssetUrl")) {
      addFailure(`${rel}: R2 public URL assembly must use joinPublicAssetUrl`);
    }
  }
}

function checkAuthRedirectPolicy() {
  const policy = read("lib/auth/redirect.ts");
  for (const fragment of [
    "normalizeInternalNext",
    "DEFAULT_AUTH_NEXT",
    'value.startsWith("//")',
    '"http://internal.local"',
  ]) {
    if (!policy.includes(fragment)) {
      addFailure(`lib/auth/redirect.ts: missing auth redirect policy fragment ${fragment}`);
    }
  }

  for (const rel of ["app/auth/callback/route.ts", "app/(public)/login/login-button.tsx"]) {
    const source = read(rel);
    if (!source.includes('from "@/lib/auth/redirect"') || !source.includes("normalizeInternalNext(")) {
      addFailure(`${rel}: OAuth next value must be normalized with normalizeInternalNext`);
    }
  }

  const loginButton = read("app/(public)/login/login-button.tsx");
  if (loginButton.includes('searchParams.get("next") ??')) {
    addFailure("app/(public)/login/login-button.tsx: raw next fallback must not enter OAuth redirectTo");
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
    "PRIVATE_API_CACHE_CONTROL",
    "withPrivateApiHeaders",
    "appendVary(headers, \"Cookie\")",
    "return withPrivateApiHeaders(response)",
    "MAX_MUTATION_BODY_BYTES",
    "content-length",
    "contentType && !isJsonContentType(contentType)",
    "bodyBytes === 0",
    "!isJsonContentType(contentType)",
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

function checkHighRiskMutationRateLimits() {
  const expectations = new Map([
    ["app/api/events/route.ts", ["checkDailyLimit", "CLIENT_EVENT_DAILY_LIMIT", "CLIENT_EVENT_TARGET_DAILY_LIMIT"]],
    ["app/api/posts/route.ts", ["checkDailyLimit", "post_create"]],
    ["app/api/posts/[id]/comments/route.ts", ["checkDailyLimit", "comment_create"]],
    ["app/api/jobs/route.ts", ["checkDailyLimit", "JOB_CREATE_DAILY_LIMIT", "job_create"]],
    ["app/api/jobs/[id]/bookmark/route.ts", ["checkDailyLimit", "JOB_BOOKMARK_DAILY_LIMIT", "job_bookmark"]],
    ["app/api/uploads/route.ts", ["checkDailyLimit", "profile_upload_url_request", "asset_upload_url_request"]],
    ["app/api/uploads/from-url/route.ts", ["checkDailyLimit", "remote_image_import"]],
    ["app/api/proposal/route.ts", ["checkDailyLimit", "proposal_email_click"]],
    ["app/api/reports/route.ts", ["checkDailyLimit", "report_submit"]],
  ]);

  for (const [rel, fragments] of expectations) {
    const source = read(rel);
    for (const fragment of fragments) {
      if (!source.includes(fragment)) {
        addFailure(`${rel}: high-risk mutation must keep rate limit fragment ${fragment}`);
      }
    }
  }
}

function checkUploadSigningPolicy() {
  const policy = read("lib/uploads/policy.ts");
  for (const fragment of [
    "MAX_UPLOAD_BYTES_BY_SCOPE",
    "profile:",
    "cover:",
    "content:",
    "album:",
  ]) {
    if (!policy.includes(fragment)) {
      addFailure(`lib/uploads/policy.ts: missing upload policy fragment ${fragment}`);
    }
  }

  const uploadRoute = read("app/api/uploads/route.ts");
  for (const fragment of [
    "uploadContentLengthSchema",
    "MAX_UPLOAD_BYTES_BY_SCOPE",
    "contentLength",
    "status: 413",
  ]) {
    if (!uploadRoute.includes(fragment)) {
      addFailure(`app/api/uploads/route.ts: missing upload size enforcement fragment ${fragment}`);
    }
  }

  const storage = read("lib/storage/index.ts");
  if (!storage.includes("ContentLength: opts.contentLength")) {
    addFailure("lib/storage/index.ts: presigned PUT must include ContentLength when provided");
  }

  const uploadHook = read("components/admin/useImageUpload.ts");
  for (const fragment of [
    "MAX_UPLOAD_BYTES_BY_SCOPE",
    "blob.size",
    "contentLength: blob.size",
  ]) {
    if (!uploadHook.includes(fragment)) {
      addFailure(`components/admin/useImageUpload.ts: missing client upload size fragment ${fragment}`);
    }
  }
}

function checkRemoteImageImportPolicy() {
  const source = read("app/api/uploads/from-url/route.ts");
  for (const fragment of [
    "sec-fetch-site",
    'parsed.protocol !== "https:"',
    "parsed.username || parsed.password",
    "isAllowedRemoteImagePort",
    'url.protocol === "https:"',
    "isBlockedHost(parsed.hostname)",
    "lookup(host, { all: true })",
    "redirect: \"error\"",
    "FETCH_TIMEOUT_MS",
    "ALLOWED_TYPES",
    "MAX_BYTES",
    "reader.cancel()",
  ]) {
    if (!source.includes(fragment)) {
      addFailure(`app/api/uploads/from-url/route.ts: missing remote image guard fragment ${fragment}`);
    }
  }
  if (source.includes('parsed.protocol !== "http:"') || source.includes('url.protocol === "http:"')) {
    addFailure("app/api/uploads/from-url/route.ts: remote image import must be HTTPS-only");
  }
}

function checkOperationalIndexes() {
  const source = read("supabase/migrations/0007_operational_query_indexes.sql");
  for (const indexName of [
    "blocks_blocked_profile_lookup",
    "profile_tags_tag_profile_lookup",
    "job_tags_tag_job_lookup",
    "notifications_inbox_lookup",
    "notifications_unread_lookup",
    "comments_published_post_time",
    "reports_status_time_lookup",
    "reports_target_lookup",
    "profiles_directory_updated_lookup",
    "jobs_published_created_lookup",
    "jobs_author_updated_lookup",
    "job_bookmarks_profile_time_lookup",
    "articles_status_created_lookup",
    "albums_public_event_created_lookup",
    "album_images_album_sort_created_lookup",
  ]) {
    if (!source.includes(indexName)) {
      addFailure(`supabase/migrations/0007_operational_query_indexes.sql: missing ${indexName}`);
    }
  }
}

function checkEventRetentionRollup() {
  const migration = read("supabase/migrations/0008_event_retention_rollup.sql");
  const lockMigration = read("supabase/migrations/0009_event_retention_rollup_lock.sql");
  for (const fragment of [
    "rollup_expired_events",
    "retention_days integer default 90",
    "insert into public.event_daily",
    "delete from public.events",
    "revoke all on function public.rollup_expired_events(integer) from public",
    "grant execute on function public.rollup_expired_events(integer) to service_role",
  ]) {
    if (!migration.includes(fragment)) {
      addFailure(`supabase/migrations/0008_event_retention_rollup.sql: missing ${fragment}`);
    }
  }

  for (const fragment of [
    "events_retention_created_lookup",
    "pg_try_advisory_xact_lock",
    "event_rollup_already_running",
    "'skipped', true",
    "'skipped', false",
    "revoke all on function public.rollup_expired_events(integer) from public",
    "grant execute on function public.rollup_expired_events(integer) to service_role",
  ]) {
    if (!lockMigration.includes(fragment)) {
      addFailure(`supabase/migrations/0009_event_retention_rollup_lock.sql: missing ${fragment}`);
    }
  }

  const script = read("scripts/rollup-events.mjs");
  for (const fragment of [
    "/rest/v1/rpc/rollup_expired_events",
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "retention_days",
  ]) {
    if (!script.includes(fragment)) {
      addFailure(`scripts/rollup-events.mjs: missing ${fragment}`);
    }
  }

  const pkg = JSON.parse(read("package.json"));
  if (pkg.scripts?.["events:rollup"] !== "node scripts/rollup-events.mjs") {
    addFailure("package.json: missing events:rollup script");
  }
}

function checkPostgrestSearchSanitization() {
  const search = read("lib/search.ts");
  for (const fragment of [
    "sanitizeSearchTerm",
    "toSafeIlikePattern",
    "return term ? `%${term}%` : null",
  ]) {
    if (!search.includes(fragment)) {
      addFailure(`lib/search.ts: missing PostgREST search sanitization fragment ${fragment}`);
    }
  }

  for (const rel of ["lib/profile/queries.ts", "lib/jobs/queries.ts", "app/api/admin/members/route.ts"]) {
    const source = read(rel);
    if (!source.includes("toSafeIlikePattern")) {
      addFailure(`${rel}: PostgREST .or() search must use toSafeIlikePattern`);
    }
    if (source.includes("sanitizeSearchTerm(") || /`%\\$\\{[^}]+\\}%`/.test(source)) {
      addFailure(`${rel}: build search patterns through toSafeIlikePattern`);
    }
  }
}

function checkUserExternalUrlPolicy() {
  const source = read("lib/validators/index.ts");
  for (const fragment of [
    "function isSafeHttpsUrl",
    "url.protocol === \"https:\"",
    "!url.username",
    "!url.password",
    "!url.port",
    "u.hostname === \"open.kakao.com\"",
    "apply_url:",
    "external_url:",
    "return isSafeHttpsUrl(value)",
  ]) {
    if (!source.includes(fragment)) {
      addFailure(`lib/validators/index.ts: missing user external URL policy fragment ${fragment}`);
    }
  }
}

function checkDataMinimization() {
  for (const rel of [...walk("app"), ...walk("lib")].filter((f) => /\.(ts|tsx)$/.test(f))) {
    const source = read(rel);
    if (source.includes('.select("*")') || source.includes(".select('*')")) {
      addFailure(`${rel}: select all columns is not allowed; use an explicit column list`);
    }
  }

  const authGuard = read("lib/guards/withAuth.ts");
  for (const fragment of [
    "export type AuthProfile",
    "const AUTH_PROFILE_COLS",
    ".select(`${AUTH_PROFILE_COLS}, admins!admins_profile_id_fkey(id)`)",
  ]) {
    if (!authGuard.includes(fragment)) {
      addFailure(`lib/guards/withAuth.ts: missing auth profile column policy fragment ${fragment}`);
    }
  }
  if (authGuard.includes('.select("*, admins!admins_profile_id_fkey(id)")')) {
    addFailure("lib/guards/withAuth.ts: auth context must not select all profile columns");
  }

  const myProfile = read("lib/profile/me.ts");
  for (const fragment of [
    "MY_PROFILE_COLS",
    ".select(MY_PROFILE_COLS)",
    "loadMyProfile",
    "loadMyTagIds",
  ]) {
    if (!myProfile.includes(fragment)) {
      addFailure(`lib/profile/me.ts: missing my-profile column policy fragment ${fragment}`);
    }
  }

  const myProfileRoute = read("app/api/profiles/me/route.ts");
  if (myProfileRoute.includes('.select("*")')) {
    addFailure("app/api/profiles/me/route.ts: profile editor API must not select all columns");
  }

  const jobMutationRoute = read("app/api/jobs/[id]/route.ts");
  if (!jobMutationRoute.includes('.select("id, author_id, status")')) {
    addFailure("app/api/jobs/[id]/route.ts: job access check must use minimal columns");
  }
  if (jobMutationRoute.includes('.select("*")')) {
    addFailure("app/api/jobs/[id]/route.ts: job mutation route must not select all columns");
  }

  const jobQueries = read("lib/jobs/queries.ts");
  for (const fragment of [
    "const DETAIL_COLS",
    ".select(DETAIL_COLS)",
  ]) {
    if (!jobQueries.includes(fragment)) {
      addFailure(`lib/jobs/queries.ts: missing job detail column policy fragment ${fragment}`);
    }
  }

  const profileQueries = read("lib/profile/queries.ts");
  for (const fragment of [
    "const PROFILE_DETAIL_COLS",
    ".select(PROFILE_DETAIL_COLS)",
    "PublicProfileSource",
  ]) {
    if (!profileQueries.includes(fragment)) {
      addFailure(`lib/profile/queries.ts: missing profile detail column policy fragment ${fragment}`);
    }
  }
  const detailBlockStart = profileQueries.indexOf("export async function getProfileDetail");
  const detailBlockEnd = profileQueries.indexOf("/** profile_tags", detailBlockStart);
  const detailBlock =
    detailBlockStart >= 0 && detailBlockEnd > detailBlockStart
      ? profileQueries.slice(detailBlockStart, detailBlockEnd)
      : "";
  if (detailBlock.includes('.select("*")')) {
    addFailure("lib/profile/queries.ts: profile detail must not select all columns");
  }

  const albumPublic = read("lib/albums/public.ts");
  for (const fragment of [
    "PublicAlbumListItem",
    "PublicAlbumDetail",
    "PublicAlbumImage",
    ".select(\"id,title,event_date,description,hashtags,cover_image_key,created_at\")",
    ".select(\"id,title,event_date,description,hashtags,cover_image_key,youtube_video_id,consent_confirmed,is_public,created_at,updated_at\")",
    ".select(\"id,image_key,caption,sort_order,created_at\")",
  ]) {
    if (!albumPublic.includes(fragment)) {
      addFailure(`lib/albums/public.ts: missing album public column policy fragment ${fragment}`);
    }
  }
  if (albumPublic.includes('.select("*")')) {
    addFailure("lib/albums/public.ts: public album queries must not select all columns");
  }

  const contentPublic = read("lib/content/public.ts");
  for (const fragment of [
    "const ARTICLE_DETAIL_COLS",
    ".select(ARTICLE_DETAIL_COLS)",
    "ArticleDetailRow",
    ".is(\"deleted_at\", null)",
  ]) {
    if (!contentPublic.includes(fragment)) {
      addFailure(`lib/content/public.ts: missing content public column policy fragment ${fragment}`);
    }
  }
  if (contentPublic.includes('.select("*")')) {
    addFailure("lib/content/public.ts: public content queries must not select all columns");
  }

  const notificationQueries = read("lib/notifications/queries.ts");
  for (const fragment of [
    "NotificationListItem",
    ".select(\"id,type,payload,read_at,created_at\")",
    ".limit(100)",
  ]) {
    if (!notificationQueries.includes(fragment)) {
      addFailure(`lib/notifications/queries.ts: missing notification column policy fragment ${fragment}`);
    }
  }
  if (notificationQueries.includes('.select("*")')) {
    addFailure("lib/notifications/queries.ts: notification inbox must not select all columns");
  }

  const adminJobsRoute = read("app/api/admin/jobs/route.ts");
  for (const fragment of [
    "ADMIN_JOB_LIST_COLS",
    ".select(ADMIN_JOB_LIST_COLS)",
    ".limit(100)",
  ]) {
    if (!adminJobsRoute.includes(fragment)) {
      addFailure(`app/api/admin/jobs/route.ts: missing admin job list column policy fragment ${fragment}`);
    }
  }
  if (adminJobsRoute.includes('.select("*")')) {
    addFailure("app/api/admin/jobs/route.ts: admin job list must not select all columns");
  }

  const adminContentRoute = read("app/api/admin/content/route.ts");
  for (const fragment of [
    "ADMIN_ARTICLE_LIST_COLS",
    ".select(ADMIN_ARTICLE_LIST_COLS)",
    ".limit(200)",
  ]) {
    if (!adminContentRoute.includes(fragment)) {
      addFailure(`app/api/admin/content/route.ts: missing admin content list column policy fragment ${fragment}`);
    }
  }
  if (adminContentRoute.includes('.select("*")')) {
    addFailure("app/api/admin/content/route.ts: admin content list must not select all columns");
  }

  const adminAlbumsRoute = read("app/api/admin/albums/route.ts");
  for (const fragment of [
    "ADMIN_ALBUM_LIST_COLS",
    ".select(ADMIN_ALBUM_LIST_COLS)",
    ".select(\"id,title,is_public\")",
    ".limit(200)",
  ]) {
    if (!adminAlbumsRoute.includes(fragment)) {
      addFailure(`app/api/admin/albums/route.ts: missing admin album column policy fragment ${fragment}`);
    }
  }
  if (adminAlbumsRoute.includes('.select("*")')) {
    addFailure("app/api/admin/albums/route.ts: admin album route must not select all columns");
  }

  const adminReportsRoute = read("app/api/admin/reports/route.ts");
  for (const fragment of [
    "ADMIN_REPORT_LIST_COLS",
    ".select(ADMIN_REPORT_LIST_COLS)",
    "ADMIN_REPORT_ACTION_COLS",
    ".select(ADMIN_REPORT_ACTION_COLS)",
    ".limit(100)",
  ]) {
    if (!adminReportsRoute.includes(fragment)) {
      addFailure(`app/api/admin/reports/route.ts: missing admin report column policy fragment ${fragment}`);
    }
  }

  const adminAlbumDetailRoute = read("app/api/admin/albums/[id]/route.ts");
  for (const fragment of [
    "ADMIN_ALBUM_EDITOR_COLS",
    ".select(ADMIN_ALBUM_EDITOR_COLS)",
    "ADMIN_ALBUM_IMAGE_EDITOR_COLS",
    ".select(ADMIN_ALBUM_IMAGE_EDITOR_COLS)",
    ".select(\"id,consent_confirmed,is_public\")",
  ]) {
    if (!adminAlbumDetailRoute.includes(fragment)) {
      addFailure(`app/api/admin/albums/[id]/route.ts: missing admin album detail column policy fragment ${fragment}`);
    }
  }

  const adminAlbumImagesRoute = read("app/api/admin/albums/[id]/images/route.ts");
  for (const fragment of [
    "ADMIN_ALBUM_IMAGE_EDITOR_COLS",
    ".select(ADMIN_ALBUM_IMAGE_EDITOR_COLS)",
  ]) {
    if (!adminAlbumImagesRoute.includes(fragment)) {
      addFailure(`app/api/admin/albums/[id]/images/route.ts: missing admin album image column policy fragment ${fragment}`);
    }
  }

  const adminContentDetailRoute = read("app/api/admin/content/[id]/route.ts");
  for (const fragment of [
    "ADMIN_ARTICLE_EDITOR_COLS",
    ".select(ADMIN_ARTICLE_EDITOR_COLS)",
  ]) {
    if (!adminContentDetailRoute.includes(fragment)) {
      addFailure(`app/api/admin/content/[id]/route.ts: missing admin content detail column policy fragment ${fragment}`);
    }
  }

  const jobEditPage = read("app/(app)/jobs/[id]/edit/page.tsx");
  for (const fragment of [
    "JOB_EDITOR_COLS",
    ".select(JOB_EDITOR_COLS)",
  ]) {
    if (!jobEditPage.includes(fragment)) {
      addFailure(`app/(app)/jobs/[id]/edit/page.tsx: missing job editor column policy fragment ${fragment}`);
    }
  }
}

function checkListQueryParamValidation() {
  const validators = read("lib/validators/index.ts");
  for (const fragment of [
    "profileListQuerySchema",
    "jobListQuerySchema",
    "optionalCursorSchema",
    "optionalLimitSchema",
    ".max(5000",
    ".max(50",
  ]) {
    if (!validators.includes(fragment)) {
      addFailure(`lib/validators/index.ts: missing list query validation fragment ${fragment}`);
    }
  }

  for (const [rel, schema] of [
    ["app/api/profiles/route.ts", "profileListQuerySchema"],
    ["app/api/jobs/route.ts", "jobListQuerySchema"],
  ]) {
    const source = read(rel);
    if (!source.includes(schema) || !source.includes("safeParse(Object.fromEntries(sp))")) {
      addFailure(`${rel}: list query params must be validated with ${schema}`);
    }
    if (source.includes("Number(") || source.includes(" as JobType")) {
      addFailure(`${rel}: list query params must not be parsed with unchecked casts`);
    }
  }
}

function checkAdminQueryParamValidation() {
  const validators = read("lib/validators/index.ts");
  for (const fragment of [
    "optionalAdminStatusFilterSchema",
    "adminMemberListQuerySchema",
    "adminJobListQuerySchema",
    "adminReportListQuerySchema",
  ]) {
    if (!validators.includes(fragment)) {
      addFailure(`lib/validators/index.ts: missing admin query validation fragment ${fragment}`);
    }
  }

  for (const [rel, schema] of [
    ["app/api/admin/members/route.ts", "adminMemberListQuerySchema"],
    ["app/api/admin/jobs/route.ts", "adminJobListQuerySchema"],
    ["app/api/admin/reports/route.ts", "adminReportListQuerySchema"],
  ]) {
    const source = read(rel);
    if (!source.includes(schema) || !source.includes("safeParse(Object.fromEntries(sp))")) {
      addFailure(`${rel}: admin list query params must be validated with ${schema}`);
    }
    if (source.includes("statusParam") || source.includes("searchParams.get(\"q\")")) {
      addFailure(`${rel}: admin list query params must not be parsed ad hoc`);
    }
  }
}

function checkClientWritableEventTypes() {
  const source = read("lib/validators/index.ts");
  const start = source.indexOf("export const clientEventInputSchema");
  const end = source.indexOf("/** 제안 이메일", start);
  const block = start >= 0 && end > start ? source.slice(start, end) : "";
  if (!block) {
    addFailure("lib/validators/index.ts: missing clientEventInputSchema");
    return;
  }

  for (const serverOnlyEvent of [
    "proposal_email_click",
    "job_bookmark",
    "job_create",
    "post_create",
    "comment_create",
    "profile_upload_url_request",
    "asset_upload_url_request",
    "remote_image_import",
    "report_submit",
  ]) {
    if (block.includes(serverOnlyEvent)) {
      addFailure(`lib/validators/index.ts: server-side event ${serverOnlyEvent} must not be client-writable`);
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

function checkConnectCommentPreviewLimit() {
  const queries = read("lib/connect/queries.ts");
  for (const fragment of [
    "MAX_COMMENT_PREVIEW_LIMIT",
    "limit = 5",
    "normalizedLimit",
    '.order("created_at", { ascending: false })',
    ".limit(normalizedLimit)",
    ".toReversed()",
  ]) {
    if (!queries.includes(fragment)) {
      addFailure(`lib/connect/queries.ts: missing bounded comment preview fragment ${fragment}`);
    }
  }

  const route = read("app/api/posts/[id]/comments/route.ts");
  for (const fragment of [
    "COMMENT_PREVIEW_LIMIT = 5",
    "listComments(id, COMMENT_PREVIEW_LIMIT)",
  ]) {
    if (!route.includes(fragment)) {
      addFailure(`app/api/posts/[id]/comments/route.ts: comments API must use bounded preview fragment ${fragment}`);
    }
  }

  const panel = read("components/connect/CommentsPanel.tsx");
  if (panel.includes("items.slice(0, 5)")) {
    addFailure("components/connect/CommentsPanel.tsx: comment limit belongs in the server query, not client slice");
  }
}

function checkConnectEngagementAggregation() {
  const migration = read("supabase/migrations/0010_post_engagement_counts.sql");
  for (const fragment of [
    "get_post_engagement_counts",
    "returns table",
    "post_likes",
    "comments",
    "count(*)::integer",
    "where c.status = 'published'",
    "revoke all on function public.get_post_engagement_counts(uuid[]) from public",
    "revoke all on function public.get_post_engagement_counts(uuid[]) from anon",
    "revoke all on function public.get_post_engagement_counts(uuid[]) from authenticated",
    "grant execute on function public.get_post_engagement_counts(uuid[]) to service_role",
  ]) {
    if (!migration.includes(fragment)) {
      addFailure(`supabase/migrations/0010_post_engagement_counts.sql: missing engagement RPC fragment ${fragment}`);
    }
  }

  const queries = read("lib/connect/queries.ts");
  for (const fragment of [
    "fetchEngagementCounts(postIds)",
    "EngagementCountRpc",
    "runEngagementRpc",
    '"get_post_engagement_counts"',
    "fetchEngagementCountsByRows(postIds)",
    "engagement.get(post.id)?.like_count",
    "engagement.get(post.id)?.comment_count",
  ]) {
    if (!queries.includes(fragment)) {
      addFailure(`lib/connect/queries.ts: missing engagement aggregation fragment ${fragment}`);
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

function checkMarkdownUrlPolicy() {
  const policy = read("lib/markdown/url-policy.ts");
  for (const fragment of [
    "ALLOWED_LINK_PROTOCOLS",
    "ALLOWED_MEDIA_PROTOCOLS",
    '"https:"',
    '"mailto:"',
    '"tel:"',
    'trimmed.startsWith("//")',
    'key === "src"',
    'node.tagName === "img"',
    "normalizeMarkdownUrl",
    "markdownUrlTransform",
  ]) {
    if (!policy.includes(fragment)) {
      addFailure(`lib/markdown/url-policy.ts: missing markdown URL policy fragment ${fragment}`);
    }
  }

  const reader = read("components/content/ArticleReader.tsx");
  for (const fragment of ["markdownUrlTransform", "urlTransform={markdownUrlTransform}"]) {
    if (!reader.includes(fragment)) {
      addFailure(`components/content/ArticleReader.tsx: markdown reader must use safe URL transform ${fragment}`);
    }
  }

  const editor = read("components/admin/RichEditor.tsx");
  for (const fragment of ["normalizeMarkdownUrl", "setLink({ href: safeUrl })"]) {
    if (!editor.includes(fragment)) {
      addFailure(`components/admin/RichEditor.tsx: markdown editor must validate links with ${fragment}`);
    }
  }
}

function checkEnvFiles() {
  const trackedEnv = trackedFiles().filter((rel) => {
    const name = path.basename(rel);
    return (
      (name.startsWith(".env") && rel !== ".env.example") ||
      rel.startsWith(".vercel/") ||
      rel === "docs/FORK_ENV.private.md"
    );
  });
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

function checkTrackedSecretValues() {
  const sensitiveValues = loadSensitiveEnvValues();
  if (sensitiveValues.length === 0) return;

  const files = trackedFiles().filter(
    (rel) =>
      rel !== "package-lock.json" &&
      !rel.startsWith(".next/") &&
      !rel.startsWith("node_modules/") &&
      !rel.startsWith("test-results/") &&
      !rel.startsWith("playwright-report/"),
  );
  scanBuildFiles(
    files,
    sensitiveValues.map((item) => item.value),
    "tracked file",
    sensitiveValues,
  );
}

function checkPackageSecurityAudit() {
  const pkg = JSON.parse(read("package.json"));
  const scripts = pkg.scripts ?? {};
  if (scripts["security:audit"] !== "npm audit --omit=dev --audit-level=moderate") {
    addFailure("package.json: security:audit must audit production dependencies at moderate+ severity");
  }
  if (scripts["security:audit:all"] !== "npm audit --audit-level=moderate") {
    addFailure("package.json: security:audit:all must audit all dependencies at moderate+ severity");
  }
  if (!scripts.check?.includes("npm run security:audit")) {
    addFailure("package.json: npm run check must include security:audit");
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

  return Object.entries(env)
    .filter(([name]) => isSensitiveEnvName(name))
    .map(([name, value]) => ({ name, value: value ?? "" }))
    .filter(
      (item) =>
        item.value.length >= 12 &&
        ![
          "local-service-key",
          "local-access-key",
          "local-secret-key",
        ].includes(item.value),
    );
}

function isSensitiveEnvName(name) {
  if (name.startsWith("NEXT_PUBLIC_")) return false;
  return (
    [
      "SUPABASE_SERVICE_ROLE_KEY",
      "RESEND_API_KEY",
      "R2_ACCESS_KEY_ID",
      "R2_SECRET_ACCESS_KEY",
      "DATABASE_URL",
      "DB_PASSWORD",
      "SUPABASE_DB_PASSWORD",
    ].includes(name) ||
    /(SECRET|TOKEN|PASSWORD|PRIVATE|SERVICE_ROLE|ACCESS_KEY|API_KEY)$/i.test(name)
  );
}

const files = [...walk("app"), ...walk("components"), ...walk("lib")];

checkNoClientSecretImports(files);
checkSensitiveLibsAreServerOnly(files);
checkApiRoutes();
checkSecurityHeaders();
checkPublicAssetUrlPolicy();
checkAuthRedirectPolicy();
checkSupabaseCookiePolicy();
checkApiMutationBodyGuard();
checkHighRiskMutationRateLimits();
checkUploadSigningPolicy();
checkRemoteImageImportPolicy();
checkOperationalIndexes();
checkEventRetentionRollup();
checkPostgrestSearchSanitization();
checkUserExternalUrlPolicy();
checkDataMinimization();
checkListQueryParamValidation();
checkAdminQueryParamValidation();
checkClientWritableEventTypes();
checkProtectedRouteCachePolicy();
checkConnectCommentPreviewLimit();
checkConnectEngagementAggregation();
checkExternalLinks(files);
checkNoDangerousHtml(files);
checkMarkdownUrlPolicy();
checkEnvFiles();
checkTrackedSecretValues();
checkPackageSecurityAudit();
checkBuildArtifacts();

if (failures.length > 0) {
  console.error("Security check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Security check passed.");
