import type { CookieOptionsWithName } from "@supabase/ssr";

export const supabaseCookieOptions = {
  path: "/",
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  httpOnly: false,
} satisfies CookieOptionsWithName;
