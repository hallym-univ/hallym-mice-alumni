export const DEFAULT_AUTH_NEXT = "/home";

/**
 * Keep OAuth next targets internal before they enter either the provider redirect
 * URL or the final app redirect. External URLs, protocol-relative URLs, and
 * malformed values fall back to the app home.
 */
export function normalizeInternalNext(
  value: string | null | undefined,
  fallback = DEFAULT_AUTH_NEXT,
): string {
  const safeFallback =
    fallback.startsWith("/") && !fallback.startsWith("//")
      ? fallback
      : DEFAULT_AUTH_NEXT;
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return safeFallback;
  }

  try {
    const url = new URL(value, "http://internal.local");
    if (url.origin !== "http://internal.local") return safeFallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return safeFallback;
  }
}
