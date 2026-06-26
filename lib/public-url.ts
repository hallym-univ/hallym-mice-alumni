/**
 * Public asset URL helpers. External asset bases must be HTTPS; an empty base
 * keeps local/dev relative-path fallback behavior.
 */
export function normalizeHttpsPublicBaseUrl(value: string): string {
  const raw = value.trim();
  if (!raw) return "";

  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || url.username || url.password) return "";
    url.hash = "";
    url.search = "";
    return url.toString().replace(/\/+$/, "");
  } catch {
    return "";
  }
}

export function joinPublicAssetUrl(baseValue: string, key: string): string {
  const base = normalizeHttpsPublicBaseUrl(baseValue);
  const cleanKey = key.replace(/^\/+/, "");
  return base ? `${base}/${cleanKey}` : `/${cleanKey}`;
}
