export const MAX_ALBUM_HASHTAGS = 8;
export const MAX_ALBUM_HASHTAG_LENGTH = 24;

export function normalizeHashtag(value: string): string | null {
  const normalized = value
    .trim()
    .replace(/^#+/, "")
    .replace(/[#,，、]+$/g, "")
    .trim()
    .toLowerCase();

  if (!normalized) return null;
  return normalized.length > MAX_ALBUM_HASHTAG_LENGTH
    ? normalized.slice(0, MAX_ALBUM_HASHTAG_LENGTH)
    : normalized;
}

export function normalizeHashtags(values: string[] | null | undefined): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values ?? []) {
    const tag = normalizeHashtag(value);
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    result.push(tag);
    if (result.length >= MAX_ALBUM_HASHTAGS) break;
  }

  return result;
}

export function parseHashtagsInput(input: string): string[] {
  return normalizeHashtags(input.split(/[\s,，、]+/));
}

export function formatHashtags(tags: string[] | null | undefined): string {
  return normalizeHashtags(tags)
    .map((tag) => `#${tag}`)
    .join(" ");
}
