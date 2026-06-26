import "server-only";

import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { publicEnv } from "@/lib/env";
import { joinPublicAssetUrl } from "@/lib/public-url";
import { getServerEnv } from "@/lib/server-env";

/**
 * Cloudflare R2 어댑터 (§9.2) — 모든 이미지 I/O의 단일 경로.
 *
 * 보안 규칙:
 *  - R2 access key / secret 은 이 파일에서만 사용한다(서버 전용, NEXT_PUBLIC 금지).
 *  - components/** 에서 import 금지(ESLint no-restricted-imports 로 차단).
 *  - 업로드는 presigned PUT URL 발급(서버 대역폭 0) → 클라가 R2에 직접 PUT.
 *  - 읽기 URL은 공개 베이스(NEXT_PUBLIC_R2_PUBLIC_BASE_URL) 기준으로 조립한다.
 */

let cachedClient: S3Client | null = null;

function getClient(): S3Client {
  if (cachedClient) return cachedClient;
  const { r2 } = getServerEnv();
  if (!r2.accountId || !r2.accessKeyId || !r2.secretAccessKey) {
    throw new Error("[storage] R2 환경변수가 설정되지 않았습니다.");
  }
  cachedClient = new S3Client({
    region: "auto",
    endpoint: `https://${r2.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: r2.accessKeyId,
      secretAccessKey: r2.secretAccessKey,
    },
  });
  return cachedClient;
}

function getBucket(): string {
  const { r2 } = getServerEnv();
  if (!r2.bucket) {
    throw new Error("[storage] R2_BUCKET 이 설정되지 않았습니다.");
  }
  return r2.bucket;
}

/**
 * presigned PUT URL 발급.
 * 클라이언트는 받은 URL로 `fetch(url, { method: 'PUT', body, headers: { 'content-type' } })` 한다.
 * @returns 업로드용 URL과 저장될 객체 key
 */
export async function getSignedUploadUrl(
  key: string,
  contentType: string,
  opts: { expiresInSeconds?: number; contentLength?: number } = {},
): Promise<{ url: string; key: string }> {
  const command = new PutObjectCommand({
    Bucket: getBucket(),
    Key: key,
    ContentType: contentType,
    ContentLength: opts.contentLength,
  });
  const url = await getSignedUrl(getClient(), command, {
    expiresIn: opts.expiresInSeconds ?? 60 * 5, // 기본 5분
  });
  return { url, key };
}

/**
 * 공개 읽기 URL 조립 (NEXT_PUBLIC_R2_PUBLIC_BASE_URL 기반).
 * DB에는 객체 key 만 저장하고, 표시 직전에 이 함수로 URL을 만든다.
 */
export function getPublicUrl(key: string): string {
  return joinPublicAssetUrl(publicEnv.r2PublicBaseUrl, key);
}

/**
 * 서버에서 직접 객체 업로드(원격 이미지 재호스팅 등 presigned 가 아닌 경로).
 * 바이트는 서버가 이미 손에 들고 있어야 한다(외부 fetch 결과 등). 호출부에서 크기·타입 검증 필수.
 */
export async function uploadObject(
  key: string,
  body: Uint8Array,
  contentType: string,
): Promise<void> {
  await getClient().send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

/** 객체 삭제(앨범/프로필 사진 교체·파기 시). */
export async function deleteObject(key: string): Promise<void> {
  await getClient().send(
    new DeleteObjectCommand({ Bucket: getBucket(), Key: key }),
  );
}
