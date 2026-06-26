import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const projectRoot = dirname(fileURLToPath(import.meta.url));
const isDev = process.env.NODE_ENV !== "production";

function r2RemotePatterns() {
  const base = process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL;
  if (!base) return [];
  try {
    const url = new URL(base);
    if (url.protocol !== "https:" || url.username || url.password) return [];
    return [{ protocol: "https", hostname: url.hostname }];
  } catch {
    return [];
  }
}

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "media-src 'self' blob: https:",
  "connect-src 'self' https: wss:",
  "frame-src https://www.youtube.com https://www.youtube-nocookie.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
].join("; ");

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: contentSecurityPolicy,
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin",
  },
  {
    key: "Origin-Agent-Cluster",
    value: "?1",
  },
  {
    key: "X-DNS-Prefetch-Control",
    value: "off",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const apiHeaders = [
  ...securityHeaders,
  {
    key: "Cache-Control",
    value: "no-store, private",
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: apiHeaders,
      },
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  // 상위 디렉토리에 다른 lockfile 이 있어도 이 프로젝트를 워크스페이스 루트로 고정한다.
  outputFileTracingRoot: projectRoot,
  // R2 공개 이미지 도메인(NEXT_PUBLIC_R2_PUBLIC_BASE_URL)에서 next/image 로드를 허용한다.
  // 빌드 시점에 env가 없을 수 있으므로 안전하게 파싱한다.
  images: {
    // AVIF 우선(webp 대비 추가 20~30% 절감), 미지원 브라우저는 webp 폴백.
    formats: ["image/avif", "image/webp"],
    remotePatterns: r2RemotePatterns(),
  },
};

export default nextConfig;
