import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

/**
 * ESLint flat config.
 *
 * 보안 게이트(§7.4 / §21.1): service_role 클라이언트(lib/supabase/admin)와
 * R2 시크릿(lib/storage)을 클라이언트 번들로 끌고 들어오지 못하게 막는다.
 *  - components/**       : 브라우저 컴포넌트. admin/storage import 전면 금지.
 *  - app/** (.tsx 등)    : "use client" 파일에서 admin import 금지(아래 규칙으로 차단).
 * server-only import 가드가 런타임 1차 방어, 이 ESLint 규칙이 CI 2차 방어다.
 */

const restrictedAdminImports = {
  patterns: [
    {
      group: ["@/lib/supabase/admin", "**/lib/supabase/admin"],
      message:
        "service_role 클라이언트(admin.ts)는 서버 전용입니다. Route Handler/Server Action 에서만 사용하세요(components/** 금지).",
    },
    {
      group: ["@/lib/storage", "@/lib/storage/*", "**/lib/storage"],
      message:
        "R2 어댑터(lib/storage)는 서버 전용입니다. components/** 에서 import 하지 마세요(§9.2).",
    },
  ],
};

const eslintConfig = [
  ...compat.config({
    extends: ["next/core-web-vitals", "next/typescript"],
  }),
  {
    ignores: [".next/**", "node_modules/**", "next-env.d.ts"],
  },
  {
    // 모든 컴포넌트(브라우저)는 admin/storage import 금지.
    // 브라우저 Supabase 클라이언트 진입점도 동일하게 막는다.
    // app/**(Server Component/Route Handler/Server Action)는 서버 전용이라 제외하되,
    // server-only import 가드가 클라이언트 누수를 런타임에서 추가 차단한다.
    files: ["components/**/*.{ts,tsx}", "lib/supabase/client.ts"],
    rules: {
      "no-restricted-imports": ["error", restrictedAdminImports],
    },
  },
];

export default eslintConfig;
