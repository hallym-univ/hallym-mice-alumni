/**
 * 부록 A(0001_init.sql) 스키마와 일치하는 수기 타입.
 *
 * NOTE: 운영에서는 `supabase gen types typescript > types/database.ts`로 재생성하는 것을
 * 권장하나(§7.3), Supabase 프로젝트 연결 전 단계에서도 타입 안전성을 확보하기 위해
 * 부록 A 스키마를 손으로 반영해 둔다. 스키마 변경 시 0001_init.sql 과 함께 갱신할 것.
 */

// ── enum-like 리터럴 유니온 (text + CHECK 제약) ────────────────────────────────
export type ProfileRole = "student" | "alumni" | "faculty" | "partner" | "admin";
export type ProfileStatus = "active" | "suspended" | "withdrawn";
export type EmploymentStatus = "employed" | "student" | "seeking";
export type CoffeechatStatus = "open" | "monthly" | "offer_only" | "busy" | "private";
export type ConsentDocType = "terms" | "privacy" | "profile_public";
export type ReportTargetType = "profile" | "job" | "article" | "post" | "comment";
export type ReportStatus = "open" | "reviewing" | "resolved" | "dismissed";
export type NotificationChannel = "in_app" | "email";
export type EmailStatus = "queued" | "sent" | "failed" | "skipped";
export type JobType =
  | "fulltime"
  | "intern"
  | "parttime"
  | "project"
  | "industry"
  | "contest"
  | "etc";
export type JobStatus = "draft" | "pending" | "published" | "closed" | "hidden";
export type ArticleStatus = "draft" | "published" | "hidden";
export type PostType = "story" | "question" | "project" | "event" | "link";
export type PostStatus = "draft" | "published" | "hidden";
export type CommentStatus = "published" | "hidden";

/** 필드별 공개 토글 (profiles.field_visibility jsonb). 키 없음 = 기본 공개. */
export type FieldVisibility = Partial<
  Record<
    | "admission_year"
    | "graduation_year"
    | "department"
    | "photo_path"
    | "organization"
    | "position"
    | "bio"
    | "career_summary"
    | "open_kakao_url",
    boolean
  >
>;

// ── Row 타입 ──────────────────────────────────────────────────────────────────

export type ProfileRow = {
  id: string;
  user_id: string;
  name: string;
  role: ProfileRole;
  status: ProfileStatus;
  is_verified: boolean;
  student_number: string | null;
  admission_year: number | null;
  graduation_year: number | null;
  department: string | null;
  organization: string | null;
  employment_status: EmploymentStatus | null;
  position: string | null;
  bio: string | null;
  career_summary: string | null;
  coffeechat_status: CoffeechatStatus | null;
  open_kakao_url: string | null;
  proposal_email_allowed: boolean;
  photo_path: string | null;
  is_public: boolean;
  field_visibility: FieldVisibility;
  deleted_at: string | null;
  anonymized_at: string | null;
  created_at: string;
  updated_at: string;
}

export type VerificationRosterRow = {
  id: string;
  student_number: string;
  name: string;
  used: boolean;
  created_at: string;
}

export type ConsentRow = {
  id: string;
  profile_id: string;
  doc_type: ConsentDocType;
  doc_version: string;
  agreed_at: string;
}

export type TagRow = {
  id: string;
  name: string;
  category: string | null;
}

export type ProfileTagRow = {
  profile_id: string;
  tag_id: string;
}

export type BlockRow = {
  id: string;
  blocker_profile_id: string;
  blocked_profile_id: string;
  created_at: string;
}

export type ReportRow = {
  id: string;
  reporter_profile_id: string | null;
  target_type: ReportTargetType;
  target_id: string;
  reason: string | null;
  status: ReportStatus;
  handled_by: string | null;
  created_at: string;
}

export type AdminRow = {
  id: string;
  profile_id: string;
  granted_by: string | null;
  created_at: string;
}

export type AdminLogRow = {
  id: string;
  admin_profile_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  detail: Record<string, unknown> | null;
  created_at: string;
}

export type EventRow = {
  id: string;
  event_type: string;
  actor_cohort_hash: string;
  profile_id: string | null;
  target_id: string | null;
  created_at: string;
}

export type EventDailyRow = {
  id: string;
  day: string;
  event_type: string;
  count: number;
}

export type NotificationRow = {
  id: string;
  profile_id: string;
  type: string;
  channel: NotificationChannel;
  payload: Record<string, unknown> | null;
  read_at: string | null;
  email_status: EmailStatus | null;
  created_at: string;
}

export type AlbumRow = {
  id: string;
  title: string;
  event_date: string | null;
  description: string | null;
  hashtags: string[];
  cover_image_key: string | null;
  youtube_video_id: string | null;
  consent_confirmed: boolean;
  is_public: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type AlbumImageRow = {
  id: string;
  album_id: string;
  image_key: string;
  caption: string | null;
  sort_order: number;
  created_at: string;
}

export type JobRow = {
  id: string;
  author_id: string | null;
  title: string;
  organization: string;
  job_type: JobType;
  location: string | null;
  deadline: string | null;
  compensation: string | null;
  description: string;
  requirements: string | null;
  apply_url: string | null;
  contact: string | null;
  status: JobStatus;
  created_at: string;
  updated_at: string;
}

export type JobTagRow = {
  job_id: string;
  tag_id: string;
}

export type JobBookmarkRow = {
  profile_id: string;
  job_id: string;
  created_at: string;
}

export type ArticleRow = {
  id: string;
  author_id: string | null;
  title: string;
  summary: string;
  body: string;
  cover_path: string | null;
  related_profile_id: string | null;
  tags: string[] | null;
  status: ArticleStatus;
  created_at: string;
  updated_at: string;
}

export type PostRow = {
  id: string;
  author_id: string;
  title: string;
  body: string;
  post_type: PostType;
  external_url: string | null;
  status: PostStatus;
  created_at: string;
  updated_at: string;
}

export type PostTagRow = {
  post_id: string;
  tag_id: string;
}

export type PostLikeRow = {
  post_id: string;
  profile_id: string;
  created_at: string;
}

export type CommentRow = {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  status: CommentStatus;
  created_at: string;
  updated_at: string;
}

/**
 * Insert/Update 타입 derivation 헬퍼.
 * - id/created_at/updated_at 등 DB default 가 있는 컬럼은 Insert 에서 optional.
 * - nullable 컬럼(`X | null`)도 Insert 에서 optional(생략 시 DB가 null/default 적용).
 * - Update 는 전체 partial.
 * gen-types 로 교체하기 전까지의 실용 매핑(부록 A 의 default/nullable 제약을 반영).
 */
type DbDefaulted = "id" | "created_at" | "updated_at";

/** 값에 null 을 허용하는 키(= NOT NULL 이 아닌 컬럼) → Insert 에서 생략 가능. */
type NullableKeys<Row> = {
  [K in keyof Row]-?: null extends Row[K] ? K : never;
}[keyof Row];

type InsertOptionalKeys<Row, Optional extends keyof Row> =
  | (DbDefaulted & keyof Row)
  | Optional
  | NullableKeys<Row>;

type InsertOf<Row, Optional extends keyof Row = never> = Omit<
  Row,
  InsertOptionalKeys<Row, Optional>
> &
  Partial<Pick<Row, InsertOptionalKeys<Row, Optional>>>;

type TableDef<Row, InsertOptional extends keyof Row = never> = {
  Row: Row;
  Insert: InsertOf<Row, InsertOptional>;
  Update: Partial<Row>;
  Relationships: [];
};

/**
 * Supabase 클라이언트 제네릭용 Database 형태(GenericSchema 호환).
 * gen-types로 교체하기 전까지의 매핑. 스키마 변경 시 0001_init.sql 과 함께 갱신할 것.
 */
export interface Database {
  public: {
    Tables: {
      profiles: TableDef<
        ProfileRow,
        | "status"
        | "is_verified"
        | "proposal_email_allowed"
        | "is_public"
        | "field_visibility"
      >;
      verification_roster: TableDef<VerificationRosterRow, "used">;
      consents: TableDef<ConsentRow, "agreed_at">;
      tags: TableDef<TagRow>;
      profile_tags: TableDef<ProfileTagRow>;
      blocks: TableDef<BlockRow>;
      reports: TableDef<ReportRow, "status">;
      admins: TableDef<AdminRow>;
      admin_logs: TableDef<AdminLogRow>;
      events: TableDef<EventRow>;
      event_daily: TableDef<EventDailyRow, "count">;
      notifications: TableDef<NotificationRow>;
      albums: TableDef<AlbumRow, "consent_confirmed" | "is_public" | "hashtags">;
      album_images: TableDef<AlbumImageRow, "sort_order">;
      jobs: TableDef<JobRow, "status">;
      job_tags: TableDef<JobTagRow>;
      job_bookmarks: TableDef<JobBookmarkRow>;
      articles: TableDef<ArticleRow, "status">;
      posts: TableDef<PostRow, "post_type" | "status">;
      post_tags: TableDef<PostTagRow>;
      post_likes: TableDef<PostLikeRow>;
      comments: TableDef<CommentRow, "status">;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
