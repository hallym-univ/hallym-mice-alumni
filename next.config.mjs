import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const projectRoot = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 상위 디렉토리에 다른 lockfile 이 있어도 이 프로젝트를 워크스페이스 루트로 고정한다.
  outputFileTracingRoot: projectRoot,
  // R2 공개 이미지 도메인(NEXT_PUBLIC_R2_PUBLIC_BASE_URL)에서 next/image 로드를 허용한다.
  // 빌드 시점에 env가 없을 수 있으므로 안전하게 파싱한다.
  images: {
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
