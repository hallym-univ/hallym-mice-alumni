import { JobsManager } from "@/components/admin/JobsManager";

/** 구인 관리 (§6.4 / §6.7). admin 레이아웃이 requireAdmin 으로 가드한다. */
export default function AdminJobsPage() {
  return (
    <div>
      <h1 className="mb-4 text-lg font-bold">구인 관리</h1>
      <JobsManager initialStatus="pending" />
    </div>
  );
}
