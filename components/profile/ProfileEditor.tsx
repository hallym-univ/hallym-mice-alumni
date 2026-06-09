"use client";

import { useMemo, useState } from "react";

import { useRouter } from "next/navigation";

import { Avatar } from "@/components/profile/Avatar";
import { useImageUpload } from "@/components/admin/useImageUpload";
import { r2PublicUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  COFFEECHAT_OPTIONS,
  EMPLOYMENT_OPTIONS,
} from "@/lib/labels";
import type { MyProfile } from "@/lib/profile/visibility";
import type { CoffeechatStatus, EmploymentStatus, FieldVisibility, TagRow } from "@/types/database";

/**
 * 내 프로필 편집 (§6.2 2단계 / §11.5 / T-201 + T-151 필드별 공개 토글).
 * 본인만. role/status/is_verified 는 폼에 없음(서버 화이트리스트로도 차단).
 *
 * 진행률 바: 2단계 핵심 필드(회사/직무/태그/소개/커피챗/오픈카톡) 채움 정도.
 */

interface FormState {
  name: string;
  department: string;
  admission_year: string;
  graduation_year: string;
  organization: string;
  employment_status: EmploymentStatus | "";
  position: string;
  bio: string;
  career_summary: string;
  coffeechat_status: CoffeechatStatus;
  open_kakao_url: string;
  proposal_email_allowed: boolean;
  is_public: boolean;
}

const VIS_FIELDS: { key: keyof FieldVisibility; label: string }[] = [
  { key: "graduation_year", label: "졸업연도" },
  { key: "admission_year", label: "입학연도" },
  { key: "department", label: "학과" },
  { key: "organization", label: "회사/기관" },
  { key: "position", label: "직무" },
  { key: "bio", label: "한 줄 소개" },
  { key: "career_summary", label: "경력 요약" },
  { key: "open_kakao_url", label: "오픈카톡 공개" },
  { key: "photo_path", label: "프로필 사진" },
];

export function ProfileEditor({
  initial,
  tags,
}: {
  initial: MyProfile;
  tags: TagRow[];
}) {
  const [form, setForm] = useState<FormState>({
    name: initial.name,
    department: initial.department ?? "",
    admission_year: initial.admission_year ? String(initial.admission_year) : "",
    graduation_year: initial.graduation_year ? String(initial.graduation_year) : "",
    organization: initial.organization ?? "",
    employment_status: initial.employment_status ?? "",
    position: initial.position ?? "",
    bio: initial.bio ?? "",
    career_summary: initial.career_summary ?? "",
    coffeechat_status: initial.coffeechat_status ?? "private",
    open_kakao_url: initial.open_kakao_url ?? "",
    proposal_email_allowed: initial.proposal_email_allowed,
    is_public: initial.is_public,
  });
  const [visibility, setVisibility] = useState<FieldVisibility>(
    initial.field_visibility ?? {},
  );
  const [tagIds, setTagIds] = useState<string[]>(initial.tag_ids);
  const [photoPath, setPhotoPath] = useState<string | null>(
    initial.photo_path ?? null,
  );
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoMsg, setPhotoMsg] = useState<string | null>(null);

  const router = useRouter();
  const { upload, uploading, error: uploadError } = useImageUpload();

  // 프로필 사진은 별도 저장 없이 즉시 적용한다(업로드/삭제 → 바로 PATCH photo_path).
  async function persistPhoto(nextPath: string | null): Promise<void> {
    setPhotoBusy(true);
    setPhotoMsg(null);
    try {
      const res = await fetch("/api/profiles/me", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ photo_path: nextPath }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setPhotoMsg(d.error ?? "사진 저장에 실패했어요.");
        return;
      }
      setPhotoPath(nextPath);
      setPhotoMsg(nextPath ? "사진을 적용했어요." : "사진을 삭제했어요.");
      router.refresh();
    } catch {
      setPhotoMsg("사진 저장에 실패했어요.");
    } finally {
      setPhotoBusy(false);
    }
  }

  async function onPickPhoto(file: File) {
    const key = await upload(file, "profile");
    if (key) await persistPhoto(key);
  }

  const progress = useMemo(() => {
    const checks = [
      form.organization || form.employment_status === "student" || form.employment_status === "seeking",
      form.position,
      tagIds.length > 0,
      form.bio,
      form.coffeechat_status && form.coffeechat_status !== "private",
      form.open_kakao_url || form.proposal_email_allowed,
    ];
    const done = checks.filter(Boolean).length;
    return Math.round((done / checks.length) * 100);
  }, [form, tagIds]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleVisibility(key: keyof FieldVisibility, visible: boolean) {
    setVisibility((v) => ({ ...v, [key]: visible }));
  }

  function toggleTag(id: string) {
    setTagIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id].slice(0, 20),
    );
  }

  async function save() {
    setState("saving");
    setError(null);
    setFieldErrors({});

    const payload = {
      name: form.name.trim(),
      department: form.department,
      admission_year: form.admission_year ? Number(form.admission_year) : null,
      graduation_year: form.graduation_year ? Number(form.graduation_year) : null,
      organization: form.organization,
      employment_status: form.employment_status || null,
      position: form.position,
      bio: form.bio,
      career_summary: form.career_summary,
      coffeechat_status: form.coffeechat_status,
      open_kakao_url: form.open_kakao_url,
      proposal_email_allowed: form.proposal_email_allowed,
      photo_path: photoPath,
      is_public: form.is_public,
      field_visibility: visibility,
      tag_ids: tagIds,
    };

    try {
      const res = await fetch("/api/profiles/me", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "저장에 실패했어요.");
        if (data.fieldErrors) setFieldErrors(data.fieldErrors);
        setState("error");
        return;
      }
      setState("saved");
      router.refresh();
      setTimeout(() => setState("idle"), 2000);
    } catch {
      setError("저장에 실패했어요.");
      setState("error");
    }
  }

  const tagsByCategory = useMemo(() => {
    const map = new Map<string, TagRow[]>();
    for (const t of tags) {
      const cat = t.category ?? "기타";
      const list = map.get(cat) ?? [];
      list.push(t);
      map.set(cat, list);
    }
    return [...map.entries()];
  }, [tags]);

  return (
    <div className="space-y-6">
      {/* 진행률 */}
      <div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>프로필 완성도</span>
          <span>{progress}%</span>
        </div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {state === "saved" ? (
        <Alert variant="success">
          <AlertDescription>저장했어요.</AlertDescription>
        </Alert>
      ) : null}
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {/* 프로필 사진 */}
      <Section title="프로필 사진">
        <div className="flex items-center gap-4">
          {photoPath ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={r2PublicUrl(photoPath)}
              alt="프로필 사진"
              className="h-20 w-20 rounded-full object-cover"
            />
          ) : (
            <Avatar src={null} name={form.name || initial.name} size={80} />
          )}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="cursor-pointer">
                <span className="inline-flex h-10 items-center rounded-md border border-input bg-background px-3 text-sm hover:bg-accent">
                  {uploading
                    ? "업로드 중..."
                    : photoBusy
                      ? "적용 중..."
                      : photoPath
                        ? "사진 변경"
                        : "사진 업로드"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading || photoBusy}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void onPickPhoto(f);
                    e.target.value = "";
                  }}
                />
              </label>
              {photoPath ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={uploading || photoBusy}
                  onClick={() => void persistPhoto(null)}
                >
                  삭제
                </Button>
              ) : null}
            </div>
            {uploadError ? (
              <p className="text-xs text-destructive">{uploadError}</p>
            ) : null}
            {photoMsg ? (
              <p className="text-xs text-emerald-600">{photoMsg}</p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              정사각형 이미지를 권장해요. 업로드하거나 삭제하면 바로 적용돼요.
            </p>
          </div>
        </div>
      </Section>

      {/* 1단계 기본 */}
      <Section title="기본 정보">
        <Field label="이름" error={fieldErrors.name}>
          <Input value={form.name} onChange={(e) => set("name", e.target.value)} maxLength={40} />
        </Field>
        <Field label="학과 / 전공">
          <Input value={form.department} onChange={(e) => set("department", e.target.value)} maxLength={60} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="입학연도">
            <Input type="number" inputMode="numeric" value={form.admission_year} onChange={(e) => set("admission_year", e.target.value)} />
          </Field>
          <Field label="졸업연도" error={fieldErrors.graduation_year}>
            <Input type="number" inputMode="numeric" value={form.graduation_year} onChange={(e) => set("graduation_year", e.target.value)} />
          </Field>
        </div>
      </Section>

      {/* 2단계 완성 */}
      <Section title="활동 / 소속">
        <Field label="회사 / 기관">
          <Input value={form.organization} onChange={(e) => set("organization", e.target.value)} placeholder="비워두고 재학/구직 상태를 선택해도 돼요" />
        </Field>
        <Field label="고용 상태">
          <Select value={form.employment_status || "none"} onValueChange={(v) => set("employment_status", v === "none" ? "" : (v as EmploymentStatus))}>
            <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">선택 안 함</SelectItem>
              {EMPLOYMENT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="직무">
          <Input value={form.position} onChange={(e) => set("position", e.target.value)} maxLength={60} />
        </Field>
        <Field label="한 줄 소개">
          <Input value={form.bio} onChange={(e) => set("bio", e.target.value)} maxLength={200} placeholder="나를 한 문장으로" />
        </Field>
        <Field label="경력 요약">
          <Textarea value={form.career_summary} onChange={(e) => set("career_summary", e.target.value)} maxLength={1000} rows={4} />
        </Field>
      </Section>

      {/* 분야 태그 */}
      <Section title="분야 태그">
        {tagsByCategory.map(([cat, list]) => (
          <div key={cat} className="space-y-1.5">
            <p className="text-xs text-muted-foreground">{cat}</p>
            <div className="flex flex-wrap gap-1.5">
              {list.map((t) => {
                const active = tagIds.includes(t.id);
                return (
                  <button key={t.id} type="button" onClick={() => toggleTag(t.id)} aria-pressed={active}>
                    <Badge variant={active ? "default" : "outline"}>{t.name}</Badge>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </Section>

      {/* 연락 */}
      <Section title="연락">
        <Field label="커피챗 상태">
          <Select value={form.coffeechat_status} onValueChange={(v) => set("coffeechat_status", v as CoffeechatStatus)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {COFFEECHAT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="오픈카톡 URL" error={fieldErrors.open_kakao_url}>
          <Input value={form.open_kakao_url} onChange={(e) => set("open_kakao_url", e.target.value)} placeholder="https://open.kakao.com/..." />
        </Field>
        <ToggleRow
          label="제안 이메일 수신 허용"
          description="오픈카톡이 없을 때 다른 회원이 서버 중계로 제안을 보낼 수 있어요."
          checked={form.proposal_email_allowed}
          onChange={(v) => set("proposal_email_allowed", v)}
        />
      </Section>

      {/* 필드별 공개 토글 */}
      <Section title="공개 범위">
        <p className="text-xs text-muted-foreground">
          이름·역할·커피챗 상태·분야 태그는 항상 공개돼요. 아래 항목은 끄면 다른
          회원에게 보이지 않아요.
        </p>
        {VIS_FIELDS.map((f) => (
          <ToggleRow
            key={f.key}
            label={f.label}
            checked={visibility[f.key] !== false}
            onChange={(v) => toggleVisibility(f.key, v)}
          />
        ))}
      </Section>

      <Button className="w-full" size="lg" onClick={save} disabled={state === "saving"}>
        {state === "saving" ? "저장 중..." : "저장하기"}
      </Button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-lg border p-4">
      <h2 className="text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-sm">{label}</p>
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}
