"use client";

import { useRef, useState } from "react";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Bold,
  Code,
  Heading2,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  Quote,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useImageUpload } from "@/components/admin/useImageUpload";
import { cn, r2PublicUrl } from "@/lib/utils";

/**
 * 블로그급 마크다운 에디터 — 툴바 + 본문 내 이미지 첨부 + 쓰기/미리보기 토글.
 * 이미지는 useImageUpload(자동 압축)로 R2 업로드 후 커서 위치에 ![](url) 삽입.
 * 렌더는 react-markdown + remark-gfm(GFM: 표·체크박스·취소선 등).
 */
export function MarkdownEditor({
  value,
  onChange,
  rows = 14,
  placeholder = "마크다운으로 작성하세요. 이미지는 툴바의 이미지 버튼으로 첨부돼요.",
}: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [tab, setTab] = useState<"write" | "preview">("write");
  const { upload, uploading, error } = useImageUpload();

  function restoreCaret(pos: number) {
    requestAnimationFrame(() => {
      const ta = ref.current;
      if (!ta) return;
      ta.focus();
      ta.selectionStart = ta.selectionEnd = pos;
    });
  }

  function surround(token: string) {
    const ta = ref.current;
    if (!ta) return;
    const s = ta.selectionStart;
    const e = ta.selectionEnd;
    const sel = value.slice(s, e) || "텍스트";
    const next = value.slice(0, s) + token + sel + token + value.slice(e);
    onChange(next);
    restoreCaret(s + token.length + sel.length + token.length);
  }

  function linePrefix(prefix: string) {
    const ta = ref.current;
    if (!ta) return;
    const s = ta.selectionStart;
    const lineStart = value.lastIndexOf("\n", s - 1) + 1;
    const next = value.slice(0, lineStart) + prefix + value.slice(lineStart);
    onChange(next);
    restoreCaret(s + prefix.length);
  }

  function insert(text: string) {
    const ta = ref.current;
    if (!ta) {
      onChange(value + text);
      return;
    }
    const s = ta.selectionStart;
    const e = ta.selectionEnd;
    const next = value.slice(0, s) + text + value.slice(e);
    onChange(next);
    restoreCaret(s + text.length);
  }

  async function onAttach(file: File) {
    const key = await upload(file, "content");
    if (key) insert(`\n![이미지](${r2PublicUrl(key)})\n`);
  }

  return (
    <div className="overflow-hidden rounded-md border">
      <div className="flex flex-wrap items-center gap-0.5 border-b bg-muted/30 p-1">
        <Tool label="굵게" onClick={() => surround("**")}>
          <Bold className="h-4 w-4" />
        </Tool>
        <Tool label="기울임" onClick={() => surround("_")}>
          <Italic className="h-4 w-4" />
        </Tool>
        <Tool label="제목" onClick={() => linePrefix("## ")}>
          <Heading2 className="h-4 w-4" />
        </Tool>
        <Tool label="목록" onClick={() => linePrefix("- ")}>
          <List className="h-4 w-4" />
        </Tool>
        <Tool label="인용" onClick={() => linePrefix("> ")}>
          <Quote className="h-4 w-4" />
        </Tool>
        <Tool label="코드" onClick={() => surround("`")}>
          <Code className="h-4 w-4" />
        </Tool>
        <Tool label="링크" onClick={() => insert("[링크 텍스트](https://)")}>
          <Link2 className="h-4 w-4" />
        </Tool>
        <label
          title="이미지 첨부"
          className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md hover:bg-accent"
        >
          <ImageIcon className="h-4 w-4" />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onAttach(f);
              e.target.value = "";
            }}
          />
        </label>

        <div className="ml-auto flex items-center rounded-md border bg-background p-0.5 text-xs">
          <TabBtn active={tab === "write"} onClick={() => setTab("write")}>
            쓰기
          </TabBtn>
          <TabBtn active={tab === "preview"} onClick={() => setTab("preview")}>
            미리보기
          </TabBtn>
        </div>
      </div>

      {tab === "write" ? (
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          placeholder={placeholder}
          className="block w-full resize-y bg-transparent p-3 text-sm leading-relaxed outline-none"
        />
      ) : (
        <div className="prose prose-sm prose-neutral min-h-[8rem] max-w-none p-3 prose-a:text-primary prose-code:before:content-none prose-code:after:content-none prose-img:rounded-lg">
          {value.trim() ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
          ) : (
            <p className="text-muted-foreground">미리볼 내용이 없어요.</p>
          )}
        </div>
      )}

      {uploading ? (
        <p className="border-t px-3 py-1.5 text-xs text-muted-foreground">
          이미지 업로드 중…
        </p>
      ) : null}
      {error ? (
        <p className="border-t px-3 py-1.5 text-xs text-destructive">{error}</p>
      ) : null}
    </div>
  );
}

function Tool({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      {children}
    </Button>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded px-2 py-1 transition-colors",
        active ? "bg-foreground text-background" : "text-muted-foreground",
      )}
    >
      {children}
    </button>
  );
}
