const ALLOWED_PROTOCOLS = new Set(["https:", "mailto:", "tel:"]);

/**
 * Markdown URL policy shared by the editor and reader.
 * Relative links stay inside the service; external links must use an explicit safe protocol.
 */
export function normalizeMarkdownUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("//")) return null;

  if (
    trimmed.startsWith("/") ||
    trimmed.startsWith("#") ||
    trimmed.startsWith("?") ||
    trimmed.startsWith("./") ||
    trimmed.startsWith("../")
  ) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);
    return ALLOWED_PROTOCOLS.has(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

export function markdownUrlTransform(value: string): string {
  return normalizeMarkdownUrl(value) ?? "";
}
