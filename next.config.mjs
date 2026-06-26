import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const projectRoot = dirname(fileURLToPath(import.meta.url));

const securityHeaders = [
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
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
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
    remotePatterns: (() => {
      const base = process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL;
      if (!base) return [];
      try {
        const url = new URL(base);
        return [{ protocol: url.protocol.replace(":", ""), hostname: url.hostname }];
      } catch {
        return [];
      }
    })(),
  },
};

export default nextConfig;
