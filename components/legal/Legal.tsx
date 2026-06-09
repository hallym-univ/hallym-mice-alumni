import Link from "next/link";
import type { ReactNode } from "react";

/**
 * 약관/처리방침 공용 레이아웃. 공개 페이지(읽기 문서)라 앱보다 넓은 단(max-w-2xl)을 쓴다.
 */
export function LegalShell({
  title,
  updated,
  intro,
  children,
}: {
  title: string;
  updated: ReactNode;
  intro?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-12">
      <Link
        href="/"
        className="text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        ← 홈
      </Link>
      <h1 className="mt-4 text-2xl font-bold tracking-tight">{title}</h1>
      <p className="mt-1 text-xs text-muted-foreground">{updated}</p>
      {intro ? (
        <p className="mt-5 text-[15px] leading-relaxed text-muted-foreground">
          {intro}
        </p>
      ) : null}
      <div className="mt-8 space-y-8 text-[15px] leading-relaxed text-foreground/90">
        {children}
      </div>
      <div className="mt-12 flex gap-4 border-t pt-6 text-sm text-muted-foreground">
        <Link href="/terms" className="underline underline-offset-4">
          이용약관
        </Link>
        <Link href="/privacy" className="underline underline-offset-4">
          개인정보 처리방침
        </Link>
      </div>
    </main>
  );
}

/** 조(Article) 단위 섹션. */
export function Article({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="mt-2 space-y-2">{children}</div>
    </section>
  );
}

/** 번호 목록. */
export function OL({ items }: { items: ReactNode[] }) {
  return (
    <ol className="list-decimal space-y-1.5 pl-5">
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ol>
  );
}

/** 글머리 목록. */
export function UL({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5">
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ul>
  );
}

/** 운영팀이 채워야 할 자리표시. 노랗게 강조해 누락을 방지한다. */
export function Fill({ children }: { children: ReactNode }) {
  return (
    <mark className="rounded bg-yellow-100 px-1 font-medium text-yellow-900">
      【{children}】
    </mark>
  );
}
