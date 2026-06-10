"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { EditorContent, useEditor } from "@tiptap/react";
import { type Editor } from "@tiptap/core";
import type { EditorView } from "@tiptap/pm/view";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableRow } from "@tiptap/extension-table-row";
import { Markdown } from "tiptap-markdown";
import {
  Bold,
  Code,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Strikethrough,
  Undo2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useImageUpload } from "@/components/admin/useImageUpload";
import { cn, r2PublicUrl } from "@/lib/utils";

/** tiptap-markdown 이 editor.storage.markdown 에 주입하는 직렬화 API(타입 미제공 → 캐스팅). */
function getMarkdown(editor: Editor): string {
  return (
    editor.storage as unknown as { markdown: { getMarkdown: () => string } }
  ).markdown.getMarkdown();
}

/**
 * 노션 같은 WYSIWYG 본문 에디터 (TipTap/ProseMirror).
 * - 타이핑하면 즉시 서식이 보이고, 저장은 마크다운 유지(tiptap-markdown) → 기존 글·리더(react-markdown) 호환.
 * - 노션/웹페이지에서 복사 붙여넣기 시 서식은 TipTap이 네이티브로 변환, 본문 내 외부 이미지는
 *   /api/uploads/from-url 로 R2 에 재호스팅(임시 URL 만료 방지). 이미지 파일 붙여넣기/드롭은 직접 업로드.
 * - 모든 이미지 업로드는 useImageUpload(자동 압축) / from-url(서버 SSRF 가드) 단일 경로.
 */
export function RichEditor({
  value,
  onChange,
  placeholder = "여기에 작성하거나, 노션·웹페이지에서 복사해 그대로 붙여넣으세요.",
}: {
  value: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
}) {
  const { upload, uploading, error } = useImageUpload();
  const fileRef = useRef<HTMLInputElement>(null);
  const rehostRef = useRef<() => void>(() => {});
  const rehostTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [rehostFailed, setRehostFailed] = useState(0); // 재호스팅 실패한 외부 이미지 수(경고용)

  const editor = useEditor({
    immediatelyRender: false, // Next.js SSR 하이드레이션 안전.
    extensions: [
      StarterKit.configure({
        link: {
          openOnClick: false,
          HTMLAttributes: {
            rel: "noopener noreferrer nofollow",
            target: "_blank",
          },
        },
      }),
      Image.configure({ HTMLAttributes: { class: "rounded-lg" } }),
      Placeholder.configure({ placeholder }),
      // 노션/시트 등에서 표 복붙 지원 — tiptap-markdown 이 GFM 표로 직렬화(리더의 remark-gfm 과 호환).
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      Markdown.configure({ html: false, transformPastedText: true, linkify: true }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm prose-neutral max-w-none min-h-[16rem] p-3 focus:outline-none prose-a:text-primary prose-img:rounded-lg",
      },
      handlePaste: (_view: EditorView, event: ClipboardEvent) => {
        // 이미지 파일 붙여넣기(단일 이미지 복사) → R2 직접 업로드.
        const files = Array.from(event.clipboardData?.files ?? []).filter((f) =>
          f.type.startsWith("image/"),
        );
        if (files.length > 0) {
          event.preventDefault();
          void uploadAndInsert(files);
          return true;
        }
        // 그 외(노션 리치 HTML 등)는 TipTap 기본 변환에 맡기고, 삽입 후 원격 이미지를 재호스팅.
        if (rehostTimerRef.current) clearTimeout(rehostTimerRef.current);
        rehostTimerRef.current = setTimeout(() => rehostRef.current(), 0);
        return false;
      },
      handleDrop: (_view: EditorView, event: DragEvent) => {
        const files = Array.from(event.dataTransfer?.files ?? []).filter((f) =>
          f.type.startsWith("image/"),
        );
        if (files.length > 0) {
          event.preventDefault();
          void uploadAndInsert(files);
          return true;
        }
        // 파일이 아닌 드롭(HTML 조각 등)도 붙여넣기와 동일하게 재호스팅 스케줄.
        if (rehostTimerRef.current) clearTimeout(rehostTimerRef.current);
        rehostTimerRef.current = setTimeout(() => rehostRef.current(), 0);
        return false;
      },
    },
    onUpdate: ({ editor }: { editor: Editor }) => {
      onChange(getMarkdown(editor));
    },
  });

  const uploadAndInsert = useCallback(
    async (files: File[]) => {
      for (const f of files) {
        const key = await upload(f, "content");
        if (key && editor && !editor.isDestroyed) {
          editor.chain().focus().setImage({ src: r2PublicUrl(key) }).run();
        }
      }
    },
    [editor, upload],
  );

  /** 본문 내 외부(비 R2) 이미지를 서버를 통해 R2 로 재호스팅하고 src 를 교체. */
  const rehostRemoteImages = useCallback(async () => {
    if (!editor || editor.isDestroyed) return;
    const r2Base = r2PublicUrl("").replace(/\/+$/, "");
    // 공개 베이스 미설정이면 "이미 R2인지" 판별 불가 → 재업로드 루프 방지 위해 스킵.
    if (!r2Base) return;
    const remote = new Set<string>();
    editor.state.doc.descendants((node: ProseMirrorNode) => {
      if (node.type.name === "image") {
        const src = node.attrs.src as string | undefined;
        if (src && /^https?:\/\//.test(src) && !src.startsWith(r2Base)) {
          remote.add(src);
        }
      }
      return true;
    });
    if (remote.size === 0) return;

    const map = new Map<string, string>();
    await Promise.all(
      Array.from(remote).map(async (src) => {
        try {
          const res = await fetch("/api/uploads/from-url", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ url: src }),
          });
          if (res.ok) {
            const j = (await res.json()) as { url?: string };
            if (j.url) map.set(src, j.url);
          }
        } catch {
          // 실패 시 원본 URL 유지(아래 경고로 노출).
        }
      }),
    );
    // 실패분은 경고로 노출 — 외부(노션 등) 임시 URL 은 만료되면 깨질 수 있음.
    setRehostFailed(remote.size - map.size);
    if (map.size === 0) return;
    if (editor.isDestroyed) return; // await 사이 언마운트 가드.

    let tr = editor.state.tr;
    editor.state.doc.descendants((node: ProseMirrorNode, pos: number) => {
      if (node.type.name === "image") {
        const src = node.attrs.src as string | undefined;
        const next = src ? map.get(src) : undefined;
        if (next) tr = tr.setNodeMarkup(pos, undefined, { ...node.attrs, src: next });
      }
      return true;
    });
    if (tr.docChanged) editor.view.dispatch(tr);
  }, [editor]);

  useEffect(() => {
    rehostRef.current = () => void rehostRemoteImages();
  }, [rehostRemoteImages]);

  // 언마운트 시 대기 중 재호스팅 타이머 정리.
  useEffect(() => {
    return () => {
      if (rehostTimerRef.current) clearTimeout(rehostTimerRef.current);
    };
  }, []);

  // 외부에서 value 가 바뀌면(편집 화면 로드 등) 동기화. 사용자가 타이핑 중(포커스)일 땐 건드리지 않아 루프 방지.
  // setContent 후 정규화된 마크다운을 부모에 즉시 반영해 "화면=저장본"을 일치시킨다
  // (tiptap-markdown 은 직렬화 시 불릿 기호 등을 정규화하므로, 안 돌려주면 저장 때 유령 diff 발생).
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const current = getMarkdown(editor);
    if (value !== current && !editor.isFocused) {
      editor.commands.setContent(value, { emitUpdate: false });
      const normalized = getMarkdown(editor);
      if (normalized !== value) onChange(normalized);
    }
    // onChange 는 의도적으로 deps 제외(부모 setState 직참조 — 매 렌더 재실행 방지).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  function addLink() {
    if (!editor) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("링크 URL", prev ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url })
      .run();
  }

  return (
    <div className="overflow-hidden rounded-md border">
      <div className="flex flex-wrap items-center gap-0.5 border-b bg-muted/30 p-1">
        <Btn editor={editor} label="굵게" active="bold" onClick={(e) => e.chain().focus().toggleBold().run()}>
          <Bold className="h-4 w-4" />
        </Btn>
        <Btn editor={editor} label="기울임" active="italic" onClick={(e) => e.chain().focus().toggleItalic().run()}>
          <Italic className="h-4 w-4" />
        </Btn>
        <Btn editor={editor} label="취소선" active="strike" onClick={(e) => e.chain().focus().toggleStrike().run()}>
          <Strikethrough className="h-4 w-4" />
        </Btn>
        <Btn
          editor={editor}
          label="제목"
          active={{ name: "heading", attrs: { level: 2 } }}
          onClick={(e) => e.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="h-4 w-4" />
        </Btn>
        <Btn
          editor={editor}
          label="소제목"
          active={{ name: "heading", attrs: { level: 3 } }}
          onClick={(e) => e.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 className="h-4 w-4" />
        </Btn>
        <Btn editor={editor} label="목록" active="bulletList" onClick={(e) => e.chain().focus().toggleBulletList().run()}>
          <List className="h-4 w-4" />
        </Btn>
        <Btn editor={editor} label="번호 목록" active="orderedList" onClick={(e) => e.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className="h-4 w-4" />
        </Btn>
        <Btn editor={editor} label="인용" active="blockquote" onClick={(e) => e.chain().focus().toggleBlockquote().run()}>
          <Quote className="h-4 w-4" />
        </Btn>
        <Btn editor={editor} label="코드" active="code" onClick={(e) => e.chain().focus().toggleCode().run()}>
          <Code className="h-4 w-4" />
        </Btn>
        <Btn editor={editor} label="링크" active="link" onClick={() => addLink()}>
          <Link2 className="h-4 w-4" />
        </Btn>

        <label
          title="이미지 첨부"
          className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md hover:bg-accent"
        >
          <ImageIcon className="h-4 w-4" />
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void uploadAndInsert([f]);
              e.target.value = "";
            }}
          />
        </label>

        <div className="ml-auto flex items-center gap-0.5">
          <Btn editor={editor} label="실행 취소" onClick={(e) => e.chain().focus().undo().run()}>
            <Undo2 className="h-4 w-4" />
          </Btn>
          <Btn editor={editor} label="다시 실행" onClick={(e) => e.chain().focus().redo().run()}>
            <Redo2 className="h-4 w-4" />
          </Btn>
        </div>
      </div>

      <EditorContent editor={editor} />

      {uploading ? (
        <p className="border-t px-3 py-1.5 text-xs text-muted-foreground">
          이미지 업로드 중…
        </p>
      ) : null}
      {error ? (
        <p className="border-t px-3 py-1.5 text-xs text-destructive">{error}</p>
      ) : null}
      {rehostFailed > 0 ? (
        <p className="border-t px-3 py-1.5 text-xs text-amber-600">
          외부 이미지 {rehostFailed}장을 우리 저장소로 옮기지 못했어요. 원본
          링크가 만료되면 깨질 수 있으니, 해당 이미지를 지우고 파일로 다시
          첨부해주세요.
        </p>
      ) : null}
    </div>
  );
}

function Btn({
  editor,
  label,
  active,
  onClick,
  children,
}: {
  editor: Editor | null;
  label: string;
  active?: string | { name: string; attrs: Record<string, unknown> };
  onClick: (editor: Editor) => void;
  children: React.ReactNode;
}) {
  const isActive =
    editor && active
      ? typeof active === "string"
        ? editor.isActive(active)
        : editor.isActive(active.name, active.attrs)
      : false;
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn("h-8 w-8", isActive && "bg-accent text-accent-foreground")}
      aria-label={label}
      title={label}
      disabled={!editor}
      onClick={() => editor && onClick(editor)}
    >
      {children}
    </Button>
  );
}
