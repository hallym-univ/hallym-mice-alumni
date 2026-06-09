import { ContentManager } from "@/components/admin/ContentManager";

/**
 * 운영자 콘텐츠 관리 (§6.6). admin 레이아웃이 requireAdmin 으로 가드한다.
 */
export const dynamic = "force-dynamic";

export default function AdminContentPage() {
  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-xl font-bold">콘텐츠</h1>
        <p className="text-sm text-muted-foreground">
          동문 인터뷰·소식을 작성하고 게시하세요.
        </p>
      </header>
      <ContentManager />
    </section>
  );
}
