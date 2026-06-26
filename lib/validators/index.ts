import { z } from "zod";

import { normalizeHashtags } from "@/lib/albums/hashtags";

/**
 * 공용 검증 스키마 (zod).
 * 외부 URL은 https만 허용하고, 오픈카톡은 open.kakao.com 화이트리스트,
 * 영상은 YouTube videoId만 추출/저장한다(§3.1, §6.5).
 */

/** https + open.kakao.com 호스트만 허용하는 오픈카톡 URL. */
export const openKakaoUrlSchema = z
  .string()
  .trim()
  .url("올바른 URL 형식이 아니에요.")
  .refine((value) => {
    try {
      const u = new URL(value);
      return u.protocol === "https:" && u.hostname === "open.kakao.com";
    } catch {
      return false;
    }
  }, "오픈카톡 링크(https://open.kakao.com/...)만 등록할 수 있어요.");

/** 일반 외부 링크(https 강제). 공고 지원 URL 등에 사용. */
export const httpsUrlSchema = z
  .string()
  .trim()
  .url("올바른 URL 형식이 아니에요.")
  .refine((value) => {
    try {
      return new URL(value).protocol === "https:";
    } catch {
      return false;
    }
  }, "https 링크만 허용돼요.");

/**
 * YouTube URL → videoId 추출. 유효하지 않으면 null.
 * 지원: youtube.com/watch?v=, youtu.be/, youtube.com/embed/, youtube.com/shorts/
 */
export function extractYoutubeVideoId(input: string): string | null {
  const value = input.trim();
  if (!value) return null;

  // 이미 11자리 videoId 만 들어온 경우
  if (/^[a-zA-Z0-9_-]{11}$/.test(value)) {
    return value;
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "");
  let id: string | null = null;

  if (host === "youtu.be") {
    id = url.pathname.split("/").filter(Boolean)[0] ?? null;
  } else if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
    if (url.pathname === "/watch") {
      id = url.searchParams.get("v");
    } else if (url.pathname.startsWith("/embed/")) {
      id = url.pathname.split("/")[2] ?? null;
    } else if (url.pathname.startsWith("/shorts/")) {
      id = url.pathname.split("/")[2] ?? null;
    }
  }

  if (id && /^[a-zA-Z0-9_-]{11}$/.test(id)) {
    return id;
  }
  return null;
}

/** YouTube URL/ID 검증 스키마(videoId 로 변환). 빈 값 허용. */
export const youtubeSchema = z
  .string()
  .trim()
  .transform((value, ctx) => {
    if (!value) return null;
    const id = extractYoutubeVideoId(value);
    if (!id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "유효한 YouTube 링크가 아니에요.",
      });
      return z.NEVER;
    }
    return id;
  });

/** 커피챗 상태(연락 가능 신호). */
export const coffeechatStatusSchema = z.enum([
  "open",
  "monthly",
  "offer_only",
  "busy",
  "private",
]);

/** 졸업/입학 연도(현실적 범위). */
export const yearSchema = z
  .number()
  .int()
  .min(1980)
  .max(new Date().getFullYear() + 6);

// ── 관리자 / 갤러리(Phase 1.5) ────────────────────────────────────────────────

/** 신고 상태머신(open → reviewing → resolved/dismissed). */
export const reportStatusSchema = z.enum([
  "open",
  "reviewing",
  "resolved",
  "dismissed",
]);

/** 회원 상태(정지/해제). */
export const profileStatusSchema = z.enum(["active", "suspended", "withdrawn"]);

/** 회원 역할. */
export const profileRoleSchema = z.enum([
  "student",
  "alumni",
  "faculty",
  "partner",
  "admin",
]);

/** YYYY-MM-DD 형식 날짜(행사일). 빈 값 → null. */
export const eventDateSchema = z
  .string()
  .trim()
  .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "YYYY-MM-DD 형식이어야 해요.")
  .transform((v) => (v === "" ? null : v));

/**
 * 업로드 허용 이미지 MIME 타입(presigned PUT 발급 시 화이트리스트).
 * R2 비용/악성 콘텐츠 방어를 위해 이미지로만 제한한다.
 */
export const uploadContentTypeSchema = z.enum([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export const uploadScopeSchema = z.enum(["album", "cover", "content", "profile"]);

const storageKeyPattern =
  "[A-Za-z0-9][A-Za-z0-9._-]{0,180}\\.(?:jpg|jpeg|png|webp|gif)";

function storageKeySchema(prefixes: string[], message: string) {
  const pattern = new RegExp(`^(?:${prefixes.join("|")})/${storageKeyPattern}$`);
  return z.string().trim().max(500).refine((value) => pattern.test(value), {
    message,
  });
}

function optionalStorageKeySchema(prefixes: string[], message: string) {
  const keySchema = storageKeySchema(prefixes, message);
  return z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((v) => (v === undefined ? undefined : v && v.length > 0 ? v : null))
    .refine((value) => value === undefined || value === null || keySchema.safeParse(value).success, {
      message,
    });
}

const profilePhotoPathSchema = optionalStorageKeySchema(
  ["profiles"],
  "프로필 사진 키가 올바르지 않아요.",
);
const albumCoverKeySchema = optionalStorageKeySchema(
  ["albums/covers", "content/covers"],
  "앨범 대표 이미지 키가 올바르지 않아요.",
);
const albumImageKeySchema = storageKeySchema(
  ["albums/images"],
  "앨범 이미지 키가 올바르지 않아요.",
);
const contentCoverPathSchema = optionalStorageKeySchema(
  ["content/covers"],
  "콘텐츠 이미지 키가 올바르지 않아요.",
);

/** 앨범 생성/수정 입력. youtube 는 videoId 로 변환되거나 null. */
export const albumInputSchema = z.object({
  title: z.string().trim().min(1, "제목을 입력해주세요.").max(200),
  event_date: eventDateSchema.optional().nullable(),
  description: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
  hashtags: z
    .array(z.string().trim().max(24))
    .max(8, "해시태그는 최대 8개까지 등록할 수 있어요.")
    .optional()
    .transform((values) => normalizeHashtags(values)),
  cover_image_key: albumCoverKeySchema,
  youtube_video_id: youtubeSchema.optional().nullable(),
  consent_confirmed: z.boolean().optional(),
  is_public: z.boolean().optional(),
});

/** 앨범 이미지 추가 입력. */
export const albumImageInputSchema = z.object({
  image_key: albumImageKeySchema,
  caption: z
    .string()
    .trim()
    .max(300)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
  sort_order: z.number().int().min(0).optional(),
});

/** 앨범 이미지 순서 변경(드래그 재정렬) — imageId 를 원하는 순서대로 나열. */
export const albumImagesReorderSchema = z.object({
  order: z
    .array(z.string().uuid("이미지 식별자가 올바르지 않아요."))
    .min(1, "정렬할 이미지가 없어요.")
    .max(500),
});

// ── 사용자 버티컬(B1): 가입/프로필/연락 ───────────────────────────────────────

/** 사용자 가입 시 선택 가능한 역할(admin/partner 제외 — 자기 권한 상승 차단). */
export const userRoleSchema = z.enum(["student", "alumni", "faculty"]);

/** 고용 상태(재학/구직 허용). */
export const employmentStatusSchema = z.enum(["employed", "student", "seeking"]);

/**
 * 빈 문자열은 null, 미전송(undefined)은 그대로 undefined 로 둔다.
 * (PATCH 부분 업데이트에서 "안 보낸 필드"가 null 로 덮어써지는 것을 방지.)
 */
const nullableText = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((v) => (v === undefined ? undefined : v && v.length > 0 ? v : null));

/** 오픈카톡 URL(빈 값 → null, 미전송 → undefined, 값이 있으면 open.kakao.com https 강제). */
const optionalOpenKakao = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((v) => (v === undefined ? undefined : v && v.length > 0 ? v : null))
  .refine(
    (v) => {
      if (v === null || v === undefined) return true;
      try {
        const u = new URL(v);
        return u.protocol === "https:" && u.hostname === "open.kakao.com";
      } catch {
        return false;
      }
    },
    { message: "오픈카톡 링크(https://open.kakao.com/...)만 등록할 수 있어요." },
  );

/**
 * 온보딩(가입 1단계) 입력 스키마 (§6.1c / §6.2 1단계 + 동의 3체크).
 * 필수: 이름·역할·학과·(졸업연도 또는 학번) + 동의 3개 true.
 */
export const onboardingSchema = z
  .object({
    name: z.string().trim().min(1, "이름을 입력해주세요.").max(40),
    role: userRoleSchema,
    department: z.string().trim().min(1, "학과/전공을 입력해주세요.").max(60),
    graduation_year: z
      .number()
      .int()
      .min(1980)
      .max(new Date().getFullYear() + 6)
      .nullable()
      .optional(),
    student_number: nullableText,
    consent_terms: z.literal(true, {
      errorMap: () => ({ message: "이용약관에 동의해야 가입할 수 있어요." }),
    }),
    consent_privacy: z.literal(true, {
      errorMap: () => ({ message: "개인정보 수집·이용에 동의해야 가입할 수 있어요." }),
    }),
    consent_profile_public: z.literal(true, {
      errorMap: () => ({ message: "프로필 공개에 동의해야 가입할 수 있어요." }),
    }),
  })
  .refine(
    (d) => d.graduation_year != null || (d.student_number && d.student_number.length > 0),
    {
      message: "졸업연도 또는 학번 중 하나는 입력해주세요.",
      path: ["graduation_year"],
    },
  );

export type OnboardingInput = z.infer<typeof onboardingSchema>;

/** field_visibility 토글 가능한 키(키 없음 = 공개, false = 비공개). */
export const fieldVisibilitySchema = z
  .object({
    admission_year: z.boolean().optional(),
    graduation_year: z.boolean().optional(),
    department: z.boolean().optional(),
    photo_path: z.boolean().optional(),
    organization: z.boolean().optional(),
    position: z.boolean().optional(),
    bio: z.boolean().optional(),
    career_summary: z.boolean().optional(),
    open_kakao_url: z.boolean().optional(),
  })
  .strict();

/**
 * 내 프로필 수정(2단계 완성 포함) 입력 스키마.
 * 보안: role/status/is_admin/is_verified/user_id 등 권한 필드는 스키마에 "존재하지 않는다"
 *       → 클라이언트가 보내도 파싱 단계에서 버려진다(자기 권한 상승 차단, §6.2 완료 기준).
 */
export const profileUpdateSchema = z.object({
  name: z.string().trim().min(1).max(40).optional(),
  department: nullableText,
  admission_year: z.number().int().min(1980).max(new Date().getFullYear() + 6).nullable().optional(),
  graduation_year: z.number().int().min(1980).max(new Date().getFullYear() + 6).nullable().optional(),
  organization: nullableText,
  employment_status: employmentStatusSchema.nullable().optional(),
  position: nullableText,
  bio: z
    .string()
    .trim()
    .max(200)
    .optional()
    .nullable()
    .transform((v) => (v === undefined ? undefined : v && v.length > 0 ? v : null)),
  career_summary: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .nullable()
    .transform((v) => (v === undefined ? undefined : v && v.length > 0 ? v : null)),
  coffeechat_status: coffeechatStatusSchema.optional(),
  open_kakao_url: optionalOpenKakao,
  proposal_email_allowed: z.boolean().optional(),
  photo_path: profilePhotoPathSchema,
  is_public: z.boolean().optional(),
  field_visibility: fieldVisibilitySchema.optional(),
  tag_ids: z.array(z.string().uuid()).max(20).optional(),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

export const accountActionSchema = z.object({
  action: z.enum(["hide", "unhide", "withdraw"], {
    errorMap: () => ({ message: "알 수 없는 동작이에요." }),
  }),
});

export const notificationReadSchema = z
  .object({
    id: z.string().uuid("알림 식별자가 올바르지 않아요.").optional(),
    all: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.all === true && value.id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "id 와 all 은 함께 보낼 수 없어요.",
        path: ["id"],
      });
    }
    if (value.all !== true && !value.id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "id 또는 all 이 필요해요.",
        path: ["id"],
      });
    }
  });

export const clientEventInputSchema = z.object({
  eventType: z.enum([
    "profile_view",
    "coffeechat_click",
    "proposal_email_click",
    "job_view",
    "job_apply_click",
    "job_bookmark",
    "article_view",
    "newsletter_click",
  ]),
  targetId: z
    .string()
    .uuid("대상 식별자가 올바르지 않아요.")
    .optional()
    .nullable()
    .transform((v) => v ?? null),
});

/** 제안 이메일 중계 입력. */
export const proposalSchema = z.object({
  target_profile_id: z.string().uuid(),
  message: z.string().trim().min(10, "10자 이상 입력해주세요.").max(1000),
});

/** 신고 접수 입력(사용자측 — profile 대상 위주). */
export const reportSchema = z.object({
  target_type: z.enum(["profile", "job", "article", "post", "comment"]),
  target_id: z.string().uuid(),
  reason: z.string().trim().max(500).optional().transform((v) => (v && v.length > 0 ? v : null)),
});

/** 차단 입력. */
export const blockSchema = z.object({
  target_profile_id: z.string().uuid(),
});

// ── Phase 2 — 구인구직(jobs) ───────────────────────────────────────────────────

/** 공고 유형. */
export const jobTypeSchema = z.enum([
  "fulltime",
  "intern",
  "parttime",
  "project",
  "industry",
  "contest",
  "etc",
]);

/** 공고 상태머신(draft→pending→published→closed/hidden). 관리자/작성자 전환용. */
export const jobStatusSchema = z.enum([
  "draft",
  "pending",
  "published",
  "closed",
  "hidden",
]);

/**
 * 공고 생성/수정 입력.
 * 보안: status/author_id 는 스키마에 "존재하지 않는다" → 서버가 강제한다
 *       (작성자가 직접 published 로 만들거나 남의 공고를 가로채는 것을 차단).
 */
export const jobInputSchema = z.object({
  title: z.string().trim().min(1, "제목을 입력해주세요.").max(200),
  organization: z.string().trim().min(1, "회사/기관명을 입력해주세요.").max(200),
  job_type: jobTypeSchema,
  location: nullableText,
  deadline: eventDateSchema.optional().nullable(),
  compensation: nullableText,
  description: z.string().trim().min(1, "상세 내용을 입력해주세요.").max(5000),
  requirements: z
    .string()
    .trim()
    .max(3000)
    .optional()
    .nullable()
    .transform((v) => (v === undefined ? undefined : v && v.length > 0 ? v : null)),
  apply_url: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((v) => (v === undefined ? undefined : v && v.length > 0 ? v : null))
    .refine(
      (v) => {
        if (v === null || v === undefined) return true;
        try {
          return new URL(v).protocol === "https:";
        } catch {
          return false;
        }
      },
      { message: "지원 링크는 https 주소만 등록할 수 있어요." },
    ),
  contact: nullableText,
  tag_ids: z.array(z.string().uuid()).max(10).optional(),
});

export type JobInput = z.infer<typeof jobInputSchema>;

export const adminJobStatusPatchSchema = z.object({
  jobId: z.string().uuid("공고 식별자가 올바르지 않아요."),
  status: jobStatusSchema,
});

// ── Phase 2.5 — 커넥트(posts) ─────────────────────────────────────────────────

export const postTypeSchema = z.enum(["story", "question", "project", "event", "link"]);

export const postInputSchema = z
  .object({
    title: z.string().trim().min(1, "제목을 입력해주세요.").max(160),
    body: z.string().trim().max(3000).default(""),
    post_type: postTypeSchema.default("story"),
    external_url: z
      .string()
      .trim()
      .optional()
      .nullable()
      .transform((v) => (v === undefined ? undefined : v && v.length > 0 ? v : null))
      .refine((v) => v === null || v === undefined || isAllowedPostUrl(v), {
        message: "링크는 내부 콘텐츠 경로 또는 https 주소만 등록할 수 있어요.",
      }),
    tag_ids: z.array(z.string().uuid()).max(10).optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.body && !value.external_url) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "내용이나 첨부 콘텐츠가 필요해요.",
        path: ["body"],
      });
    }
  });

function isAllowedPostUrl(value: string): boolean {
  if (
    /^\/(?:content|jobs|albums)\/[0-9a-fA-F-]{36}$/.test(value) ||
    /^\/connect(?:\?.*)?$/.test(value)
  ) {
    return true;
  }

  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export const commentInputSchema = z.object({
  body: z.string().trim().min(1, "댓글을 입력해주세요.").max(1000),
});

export type PostInput = z.infer<typeof postInputSchema>;
export type CommentInput = z.infer<typeof commentInputSchema>;

export const adminMemberPatchSchema = z
  .object({
    profileId: z.string().uuid("회원 식별자가 올바르지 않아요."),
    role: profileRoleSchema.optional(),
    status: profileStatusSchema.optional(),
    isVerified: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    if (
      value.role === undefined &&
      value.status === undefined &&
      value.isVerified === undefined
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "변경할 항목이 없어요.",
      });
    }
  });

export const adminReportPatchSchema = z
  .object({
    reportId: z.string().uuid("신고 식별자가 올바르지 않아요."),
    status: reportStatusSchema.optional(),
    action: z.enum(["hide", "suspend"]).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.status === undefined && value.action === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "변경할 항목이 없어요.",
      });
    }
  });

// ── Phase 3 — 콘텐츠(articles) ─────────────────────────────────────────────────

/** 콘텐츠 상태머신(draft→published→hidden). */
export const articleStatusSchema = z.enum(["draft", "published", "hidden"]);

/**
 * 콘텐츠 생성/수정 입력(운영자 작성).
 * 보안: author_id/status 는 스키마에 없음 → 서버가 설정/전환을 강제한다.
 * tags 는 articles.tags(text[]) 컬럼에 저장하는 자유 문자열 배열(태그 마스터와 무관).
 */
export const articleInputSchema = z.object({
  title: z.string().trim().min(1, "제목을 입력해주세요.").max(200),
  summary: z.string().trim().min(1, "요약을 입력해주세요.").max(500),
  body: z.string().trim().min(1, "본문을 입력해주세요.").max(20000),
  cover_path: contentCoverPathSchema,
  related_profile_id: z
    .string()
    .uuid()
    .optional()
    .nullable()
    .transform((v) => (v === undefined ? undefined : v ?? null)),
  tags: z.array(z.string().trim().min(1).max(40)).max(10).optional(),
});

export type ArticleInput = z.infer<typeof articleInputSchema>;
