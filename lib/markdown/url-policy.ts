import type { UrlTransform } from "react-markdown";

const ALLOWED_LINK_PROTOCOLS = new Set(["https:", "mailto:", "tel:"]);
const ALLOWED_MEDIA_PROTOCOLS = new Set(["https:"]);

type MarkdownUrlKind = "link" | "media";

/**
 * Markdown URL policy shared by the editor and reader.
 * Relative links stay inside the service; external links must use an explicit safe protocol.
 */
export function normalizeMarkdownUrl(
  value: string,
  kind: MarkdownUrlKind = "link",
): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("//")) return null;

  if (kind === "media" && trimmed.startsWith("/")) {
    return trimmed;
  }

  if (kind === "link" && isRelativeMarkdownLink(trimmed)) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);
    const allowed =
      kind === "media"
        ? ALLOWED_MEDIA_PROTOCOLS.has(url.protocol)
        : ALLOWED_LINK_PROTOCOLS.has(url.protocol);
    return allowed ? url.toString() : null;
  } catch {
    return null;
  }
}

export const markdownUrlTransform: UrlTransform = (value, key, node) =>
  normalizeMarkdownUrl(value, key === "src" || node.tagName === "img" ? "media" : "link") ??
  "";

function isRelativeMarkdownLink(value: string) {
  return (
    value.startsWith("/") ||
    value.startsWith("#") ||
    value.startsWith("?") ||
    value.startsWith("./") ||
    value.startsWith("../")
  );
}
