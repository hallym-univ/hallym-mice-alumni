import { DirectoryView } from "@/components/alumni/DirectoryView";
import { requireMemberPage } from "@/lib/guards/page";
import { createAdminClient } from "@/lib/supabase/admin";
import type { TagRow } from "@/types/database";

/**
 * 동문 디렉토리/검색 (§6.2 / §11.3 / T-202). 핵심 화면.
 * 서버에서 회원 가드 후 태그 마스터를 주입하고, 목록은 클라가 /api/profiles 로 페이징한다.
 */
export default async function AlumniPage() {
  await requireMemberPage("/alumni");

  const admin = createAdminClient();
  const { data: tags } = await admin
    .from("tags")
    .select("id,name,category")
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  return (
    <section>
      <header className="px-5 pt-5">
        <h1 className="text-xl font-bold">동문</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          회사·직무·분야·기수로 동문을 찾아보세요.
        </p>
      </header>
      <DirectoryView tags={(tags ?? []) as TagRow[]} />
    </section>
  );
}
