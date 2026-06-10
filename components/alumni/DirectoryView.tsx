"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Search, SlidersHorizontal, X } from "lucide-react";

import { ProfileCard } from "@/components/alumni/ProfileCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { EMPTY } from "@/lib/messages";
import { cn } from "@/lib/utils";
import type { PublicProfileCard } from "@/lib/profile/visibility";
import type { TagRow } from "@/types/database";

/**
 * 동문 디렉토리 (§11.3 / T-202).
 * 상단 고정 검색창 + 필터, 스크롤 카드 리스트, 무한 스크롤.
 * 빈 상태 3종(데이터 없음 / 검색 0건 / 필터 0건) 분리.
 */

interface Filters {
  q: string;
  tag: string;
  year: string;
  coffeechat: boolean;
}

const EMPTY_FILTERS: Filters = { q: "", tag: "", year: "", coffeechat: false };

interface ApiResult {
  items: PublicProfileCard[];
  nextCursor: number | null;
  total: number | null;
}

export function DirectoryView({
  tags,
  initialData,
}: {
  tags: TagRow[];
  /** 서버에서 미리 조회한 첫 페이지(기본 필터 기준). 있으면 마운트 fetch 를 생략한다. */
  initialData?: ApiResult;
}) {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);

  const [items, setItems] = useState<PublicProfileCard[]>(
    initialData?.items ?? [],
  );
  const [cursor, setCursor] = useState<number | null>(
    initialData ? initialData.nextCursor : 0,
  );
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "loadingMore">(
    initialData ? "ready" : "loading",
  );
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  // initialData 는 기본 필터(EMPTY_FILTERS) 기준이므로 첫 마운트의 fetch 만 건너뛴다.
  const skipFirstFetch = useRef(Boolean(initialData));

  const hasActiveFilters =
    applied.tag !== "" || applied.year !== "" || applied.coffeechat;
  const hasQuery = applied.q.trim() !== "";

  const buildUrl = useCallback(
    (cur: number) => {
      const sp = new URLSearchParams();
      if (applied.q.trim()) sp.set("q", applied.q.trim());
      if (applied.tag) sp.set("tag", applied.tag);
      if (applied.year) sp.set("year", applied.year);
      if (applied.coffeechat) sp.set("coffeechat", "open");
      sp.set("cursor", String(cur));
      return `/api/profiles?${sp.toString()}`;
    },
    [applied],
  );

  // 타이핑 즉시 검색 — 입력 멈춤 300ms 후 자동 적용(제출 불필요).
  // 값이 같으면 prev 를 그대로 반환해 불필요한 재조회를 막는다(한글 조합 입력에도 안전).
  useEffect(() => {
    const t = setTimeout(() => {
      setApplied((prev) =>
        prev.q === filters.q ? prev : { ...prev, q: filters.q },
      );
    }, 300);
    return () => clearTimeout(t);
  }, [filters.q]);

  // applied 변경 시 첫 페이지 로드. (SSR 주입분이 있으면 첫 마운트는 생략.)
  // 타이핑 중 깜빡임 방지: 이전 결과를 지우지 않고 흐리게 유지한 채 새 결과로 교체한다.
  useEffect(() => {
    if (skipFirstFetch.current) {
      skipFirstFetch.current = false;
      return;
    }
    let cancelled = false;
    setStatus("loading");
    setCursor(0);

    (async () => {
      try {
        const res = await fetch(buildUrl(0));
        if (!res.ok) throw new Error(String(res.status));
        const data: ApiResult = await res.json();
        if (cancelled) return;
        setItems(data.items);
        setCursor(data.nextCursor);
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [buildUrl]);

  const loadMore = useCallback(async () => {
    if (cursor === null || status !== "ready") return;
    setStatus("loadingMore");
    try {
      const res = await fetch(buildUrl(cursor));
      if (!res.ok) throw new Error(String(res.status));
      const data: ApiResult = await res.json();
      setItems((prev) => [...prev, ...data.items]);
      setCursor(data.nextCursor);
      setStatus("ready");
    } catch {
      setStatus("ready"); // 더보기 실패는 치명적이지 않게.
    }
  }, [buildUrl, cursor, status]);

  // 무한 스크롤 관찰자.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const ob = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "200px" },
    );
    ob.observe(el);
    return () => ob.disconnect();
  }, [loadMore]);

  function apply() {
    setApplied(filters);
    setShowFilters(false);
  }
  function reset() {
    setFilters(EMPTY_FILTERS);
    setApplied(EMPTY_FILTERS);
    setShowFilters(false);
  }
  function onSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Enter = 즉시 적용(디바운스 대기 생략). 같은 값이면 재조회 안 함.
    setApplied((prev) =>
      prev.q === filters.q ? prev : { ...prev, q: filters.q },
    );
  }

  return (
    <div>
      {/* 상단 고정: 검색 + 필터 토글 */}
      <div className="sticky top-0 z-10 space-y-3 border-b bg-background px-5 py-3">
        <form onSubmit={onSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
              placeholder="이름·회사·직무 검색"
              className="pl-9"
              aria-label="동문 검색"
            />
          </div>
          <Button
            type="button"
            variant={hasActiveFilters ? "default" : "outline"}
            size="icon"
            onClick={() => setShowFilters((s) => !s)}
            aria-label="필터"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        </form>

        {/* 활성 필터 칩 */}
        {(hasActiveFilters || hasQuery) && (
          <div className="flex flex-wrap items-center gap-1.5">
            {hasQuery ? <Chip label={`"${applied.q}"`} /> : null}
            {applied.tag ? (
              <Chip label={tags.find((t) => t.id === applied.tag)?.name ?? "태그"} />
            ) : null}
            {applied.year ? <Chip label={`${applied.year}년`} /> : null}
            {applied.coffeechat ? <Chip label="커피챗 가능" /> : null}
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground underline"
            >
              <X className="h-3 w-3" /> 초기화
            </button>
          </div>
        )}

        {/* 필터 패널 */}
        {showFilters && (
          <div className="space-y-3 rounded-lg border p-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">분야 태그</label>
              <Select
                value={filters.tag || "all"}
                onValueChange={(v) =>
                  setFilters((f) => ({ ...f, tag: v === "all" ? "" : v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="전체" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  {tags.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">졸업연도</label>
              <Input
                type="number"
                inputMode="numeric"
                value={filters.year}
                onChange={(e) => setFilters((f) => ({ ...f, year: e.target.value }))}
                placeholder="예: 2020"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={filters.coffeechat}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, coffeechat: e.target.checked }))
                }
                className="h-4 w-4"
              />
              커피챗 가능한 동문만
            </label>
            <div className="flex gap-2">
              <Button type="button" className="flex-1" onClick={apply}>
                적용
              </Button>
              <Button type="button" variant="outline" onClick={reset}>
                초기화
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 리스트 영역 — 검색 중엔 이전 결과를 흐리게 유지(스켈레톤 깜빡임 방지) */}
      <div className="px-5 py-4">
        {status === "loading" && items.length === 0 ? (
          <LoadingSkeleton variant="list" count={5} />
        ) : status === "error" ? (
          <ErrorState
            description="목록을 불러오지 못했어요."
            onRetry={() => setApplied({ ...applied })}
          />
        ) : status !== "loading" && items.length === 0 ? (
          hasQuery ? (
            <EmptyState
              title={EMPTY.searchZero.title}
              description={EMPTY.searchZero.cta}
            />
          ) : hasActiveFilters ? (
            <EmptyState
              title={EMPTY.filterZero.title}
              description={EMPTY.filterZero.cta}
              action={{ label: "필터 초기화", onClick: reset }}
            />
          ) : (
            <EmptyState title={EMPTY.noData.title} description={EMPTY.noData.cta} />
          )
        ) : (
          <div
            className={cn(
              "space-y-3 transition-opacity",
              status === "loading" && "opacity-50",
            )}
          >
            {items.map((p) => (
              <ProfileCard key={p.id} profile={p} />
            ))}
            <div ref={sentinelRef} aria-hidden className="h-px" />
            {status === "loadingMore" ? (
              <LoadingSkeleton variant="list" count={2} />
            ) : null}
            {cursor === null && status === "ready" && items.length > 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">
                모든 동문을 불러왔어요
              </p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

function Chip({ label }: { label: string }) {
  return <Badge variant="secondary">{label}</Badge>;
}
