import { randomUUID } from "node:crypto";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

import { withAuth } from "@/lib/guards/withAuth";
import { getPublicUrl, uploadObject } from "@/lib/storage";
import { makeCohortHash, recordEvent } from "@/lib/analytics/events";
import { checkDailyLimit, RateLimitUnavailableError } from "@/lib/rate-limit";

/**
 * POST /api/uploads/from-url — 외부 이미지 URL 을 서버가 가져와 R2 에 재호스팅.
 *
 * 용도: 본문 에디터에 노션 등에서 붙여넣은 이미지(임시 서명 URL)를 영구 보관용으로 옮긴다.
 * 운영자(콘텐츠 작성자)만 사용한다(role: admin).
 *
 * 보안(SSRF): 서버가 임의 URL 을 fetch 하므로 — https만 허용, 사설/루프백/링크로컬/메타데이터
 * IP 차단(DNS 해석 후 검사), HTTPS 강제, 리다이렉트 거부, 타임아웃, 이미지 content-type·크기 제한.
 * (admin 전용이라 신뢰 경계가 좁지만 심층 방어로 가드한다. DNS 리바인딩은 잔여 위험으로 수용.)
 */

const MAX_BYTES = 15 * 1024 * 1024; // 15MB
const FETCH_TIMEOUT_MS = 10_000;
const REMOTE_IMAGE_IMPORT_DAILY_LIMIT = 60;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export const POST = withAuth(
  async (req, { me }) => {
    // CSRF/교차사이트 차단: 피싱된 관리자를 통한 SSRF 오라클화 방지.
    // Sec-Fetch-Site 는 브라우저가 붙이며 JS로 위조 불가. 비-1st-party POST 거부.
    const secFetchSite = req.headers.get("sec-fetch-site")?.toLowerCase();
    if (
      secFetchSite &&
      secFetchSite !== "same-origin" &&
      secFetchSite !== "same-site"
    ) {
      return Response.json(
        { error: "허용되지 않은 요청이에요." },
        { status: 403 },
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "잘못된 요청 본문이에요." }, { status: 400 });
    }

    const url = (body as { url?: unknown })?.url;
    if (typeof url !== "string" || url.length > 2048) {
      return Response.json({ error: "url 이 필요해요." }, { status: 400 });
    }

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return Response.json({ error: "올바른 URL 이 아니에요." }, { status: 400 });
    }
    if (parsed.protocol !== "https:") {
      return Response.json({ error: "https URL 만 허용돼요." }, { status: 400 });
    }
    if (parsed.username || parsed.password) {
      return Response.json({ error: "URL 사용자 정보는 허용되지 않아요." }, { status: 400 });
    }
    if (!isAllowedRemoteImagePort(parsed)) {
      return Response.json({ error: "허용되지 않는 URL 포트예요." }, { status: 400 });
    }
    if (await isBlockedHost(parsed.hostname)) {
      return Response.json(
        { error: "허용되지 않는 호스트예요." },
        { status: 400 },
      );
    }

    const cohortHash = makeCohortHash(me.userId);
    try {
      const rate = await checkDailyLimit({
        cohortHash,
        eventType: "remote_image_import",
        limit: REMOTE_IMAGE_IMPORT_DAILY_LIMIT,
      });
      if (!rate.ok) {
        return Response.json(
          { error: "오늘 가져올 수 있는 원격 이미지 수를 모두 사용했어요." },
          { status: 429 },
        );
      }
    } catch (err) {
      if (err instanceof RateLimitUnavailableError) {
        return Response.json(
          { error: "요청 제한 확인에 실패했어요. 잠시 후 다시 시도해주세요." },
          { status: 503 },
        );
      }
      throw err;
    }

    // 타임아웃은 헤더뿐 아니라 본문 스트리밍까지 커버한다(slowloris·느린 드립 방지).
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let bytes: Uint8Array | null = null;
    let contentType = "";
    try {
      let res: globalThis.Response;
      try {
        res = await fetch(parsed.toString(), {
          redirect: "error", // 리다이렉트로 내부망 우회(SSRF) 방지.
          signal: controller.signal,
          headers: { accept: "image/*" },
        });
      } catch {
        return Response.json(
          { error: "이미지를 가져오지 못했어요." },
          { status: 502 },
        );
      }

      if (!res.ok) {
        return Response.json(
          { error: "이미지를 가져오지 못했어요." },
          { status: 502 },
        );
      }

      contentType = (res.headers.get("content-type") ?? "")
        .split(";")[0]
        .trim()
        .toLowerCase();
      if (!ALLOWED_TYPES.has(contentType)) {
        return Response.json({ error: "이미지 파일이 아니에요." }, { status: 415 });
      }

      // content-length 는 위조 가능 → cheap early-out 으로만 쓰고, 실제 바이트는
      // 스트리밍하며 한도 초과 시 즉시 중단(전체 버퍼링 후 검사로 인한 메모리 DoS 방지).
      const declared = Number(res.headers.get("content-length"));
      if (Number.isFinite(declared) && declared > MAX_BYTES) {
        return Response.json(
          { error: "이미지 크기가 너무 커요(최대 15MB)." },
          { status: 413 },
        );
      }

      const reader = res.body?.getReader();
      if (!reader) {
        return Response.json(
          { error: "이미지를 가져오지 못했어요." },
          { status: 502 },
        );
      }
      const chunks: Uint8Array[] = [];
      let total = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!value) continue;
        total += value.byteLength;
        if (total > MAX_BYTES) {
          await reader.cancel().catch(() => {}); // 업스트림 연결 즉시 정리.
          return Response.json(
            { error: "이미지 크기가 너무 커요(최대 15MB)." },
            { status: 413 },
          );
        }
        chunks.push(value);
      }
      if (total === 0) {
        await reader.cancel().catch(() => {});
        return Response.json({ error: "이미지가 비어 있어요." }, { status: 422 });
      }
      bytes = new Uint8Array(total);
      let off = 0;
      for (const c of chunks) {
        bytes.set(c, off);
        off += c.byteLength;
      }
    } catch {
      return Response.json(
        { error: "이미지를 가져오지 못했어요." },
        { status: 502 },
      );
    } finally {
      clearTimeout(timer);
    }

    if (!bytes) {
      return Response.json({ error: "저장에 실패했어요." }, { status: 500 });
    }

    const ext =
      contentType === "image/png"
        ? "png"
        : contentType === "image/webp"
          ? "webp"
          : contentType === "image/gif"
            ? "gif"
            : "jpg";
    const key = `content/covers/${randomUUID()}.${ext}`;

    try {
      await uploadObject(key, bytes, contentType);
    } catch (err) {
      console.error("[uploads/from-url] R2 업로드 실패", err);
      return Response.json({ error: "저장에 실패했어요." }, { status: 500 });
    }

    try {
      await recordEvent({
        eventType: "remote_image_import",
        cohortHash,
        profileId: me.profile.id,
      });
    } catch (e) {
      console.error("[uploads/from-url] event 기록 실패", e);
    }

    return Response.json({ key, url: getPublicUrl(key) });
  },
  { role: "admin" },
);

function isAllowedRemoteImagePort(url: URL): boolean {
  if (!url.port) return true;
  if (url.protocol === "https:") return url.port === "443";
  return false;
}

/**
 * 호스트가 사설/루프백/링크로컬/메타데이터/NAT64로 해석되면 차단(SSRF 방어).
 * 주의: 검증용 DNS 해석과 실제 fetch 연결이 각각 독립적으로 해석돼(핀ning 없음),
 * resolve/connect TOCTOU(라운드로빈·TTL0 리바인딩 포함)는 admin 전용 + Origin 가드
 * 전제 하에 잔여 위험으로 수용한다(고정하려면 검증된 IP로 직접 연결+Host 헤더 필요).
 */
async function isBlockedHost(hostname: string): Promise<boolean> {
  // URL 호스트의 대괄호([::1])·후행점 제거 후 분류.
  const host = hostname
    .toLowerCase()
    .replace(/\.$/, "")
    .replace(/^\[|\]$/g, "");
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".internal") ||
    host.endsWith(".local")
  ) {
    return true;
  }
  if (isIP(host)) return isPrivateIp(host);
  try {
    const addrs = await lookup(host, { all: true });
    if (addrs.length === 0) return true;
    return addrs.some((a) => isPrivateIp(a.address));
  } catch {
    return true; // 해석 실패 시 안전하게 차단.
  }
}

function isPrivateIp(ip: string): boolean {
  return ip.includes(":") ? isPrivateV6(ip) : isPrivateV4(ip);
}

function isPrivateV4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
    return true; // 형식 이상 → 차단.
  }
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true; // link-local + 클라우드 메타데이터(169.254.169.254)
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a >= 224) return true; // multicast/reserved
  return false;
}

function isPrivateV6(ip: string): boolean {
  let v = ip.toLowerCase();
  const pct = v.indexOf("%");
  if (pct >= 0) v = v.slice(0, pct); // zone id 제거(fe80::1%eth0)
  if (v === "::1" || v === "::") return true; // loopback/unspecified
  // IPv4-mapped ::ffff:a.b.c.d → 임베디드 v4 검사. 점표기 아니면 보수적 차단.
  if (v.startsWith("::ffff:")) {
    const m = v.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
    return m ? isPrivateV4(m[1]) : true;
  }
  if (v.startsWith("64:ff9b:")) return true; // NAT64(임베디드 v4로 내부 우회 → 전면 차단)
  // 6to4(2002:WWXX:YYZZ::/16) — 임베디드 v4(W.X.Y.Z)를 디코드해 검사. 해석 불가 형태는 차단.
  if (v.startsWith("2002:")) {
    const segs = v.split(":");
    const hex1 = segs[1] ?? "";
    const hex2 = segs[2] ?? "";
    if (!/^[0-9a-f]{1,4}$/.test(hex1) || !/^[0-9a-f]{1,4}$/.test(hex2)) {
      return true;
    }
    const n1 = parseInt(hex1, 16);
    const n2 = parseInt(hex2, 16);
    const embedded = `${n1 >> 8}.${n1 & 0xff}.${n2 >> 8}.${n2 & 0xff}`;
    return isPrivateV4(embedded);
  }
  if (v.startsWith("fc") || v.startsWith("fd")) return true; // unique-local fc00::/7
  if (/^fe[89ab]/.test(v)) return true; // link-local fe80::/10
  if (/^fe[cdef]/.test(v)) return true; // site-local(deprecated) fec0::/10
  if (v.startsWith("ff")) return true; // multicast ff00::/8
  return false;
}
