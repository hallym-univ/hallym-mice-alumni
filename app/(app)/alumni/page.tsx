import { DirectoryView } from "@/components/alumni/DirectoryView";
import { requireMemberPage } from "@/lib/guards/page";
import { listDirectory } from "@/lib/profile/queries";
import { getTagsMaster } from "@/lib/tags/queries";
import type { TagRow } from "@/types/database";

/**
 * 동문 디렉토리/검색 (§6.2 / §11.3 / T-202). 핵심 화면.
 * 첫 페이지 데이터를 서버에서 미리 조회해 주입한다 — 클라 마운트 후 API 재호출(2페이즈
 * 폭포: SSR 셸 → fetch → 렌더)을 제거해 첫 목록이 즉시 보인다.
 * 필터·검색·무한 스크롤은 기존 /api/profiles 경로 그대로.
 */
export default async function AlumniPage() {
  const me = await requireMemberPage("/alumni");

  // 서버 조회 실패 시 initialData=undefined → 컴포넌트가 기존 클라이언트
  // fetch 경로(인라인 ErrorState + 재시도)로 폴백한다(페이지 전체 500 방지).
  const [tags, initialData] = await Promise.all([
    getTagsMaster(),
    listDirectory(me, {}).catch(() => undefined),
  ]);

  return (
    <section>
      <header className="px-5 pt-5">
        <h1 className="text-xl font-bold">동문</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          회사·직무·분야·기수로 동문을 찾아보세요.
        </p>
      </header>
      <DirectoryView tags={tags as TagRow[]} initialData={initialData} />
    </section>
  );
}
