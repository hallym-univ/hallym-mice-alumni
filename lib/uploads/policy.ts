export const MAX_UPLOAD_BYTES_BY_SCOPE = {
  profile: 2 * 1024 * 1024,
  cover: 8 * 1024 * 1024,
  content: 8 * 1024 * 1024,
  album: 12 * 1024 * 1024,
} as const;

export type UploadScope = keyof typeof MAX_UPLOAD_BYTES_BY_SCOPE;

export function formatUploadBytes(bytes: number): string {
  if (bytes % (1024 * 1024) === 0) return `${bytes / (1024 * 1024)}MB`;
  return `${Math.round(bytes / 1024)}KB`;
}
