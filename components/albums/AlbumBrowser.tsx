"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";

import { Search, X } from "lucide-react";

import { AlbumGrid } from "@/components/albums/AlbumGrid";
import { EmptyState } from "@/components/common/EmptyState";
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
import { EMPTY } from "@/lib/messages";
import { cn } from "@/lib/utils";
import type { AlbumRow } from "@/types/database";

const VISIBLE_YEAR_COUNT = 4;
const VISIBLE_TAG_COUNT = 8;
const OLDER_YEAR_PLACEHOLDER = "__older_year_placeholder";

export function AlbumBrowser({ albums }: { albums: AlbumRow[] }) {
  const [query, setQuery] = useState("");
  const [year, setYear] = useState<string>("all");
  const [tag, setTag] = useState<string>("all");

  const years = useMemo(() => getYears(albums), [albums]);
  const visibleYears = years.slice(0, VISIBLE_YEAR_COUNT);
  const olderYears = years.slice(VISIBLE_YEAR_COUNT);
  const tags = useMemo(() => getTopTags(albums), [albums]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return albums.filter((album) => {
      const albumYear = getAlbumYear(album);
      const albumTags = getAlbumTags(album);
      const matchesYear = year === "all" || albumYear === year;
      const matchesTag = tag === "all" || albumTags.includes(tag);
      const matchesQuery =
        !q ||
        [album.title, album.description, ...albumTags.map((value) => `#${value}`)]
          .filter(Boolean)
          .some((value) => value?.toLowerCase().includes(q));

      return matchesYear && matchesTag && matchesQuery;
    });
  }, [albums, query, tag, year]);

  const hasFilter = query.trim() !== "" || year !== "all" || tag !== "all";

  function reset() {
    setQuery("");
    setYear("all");
    setTag("all");
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="제목, 설명, 해시태그 검색"
            className="pl-9"
          />
        </div>

        {years.length > 0 ? (
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            <FilterChip active={year === "all"} onClick={() => setYear("all")}>
              전체
            </FilterChip>
            {visibleYears.map((item) => (
              <FilterChip key={item} active={year === item} onClick={() => setYear(item)}>
                {item}
              </FilterChip>
            ))}
            {olderYears.length > 0 ? (
              <Select
                value={olderYears.includes(year) ? year : OLDER_YEAR_PLACEHOLDER}
                onValueChange={(value) => {
                  if (value !== OLDER_YEAR_PLACEHOLDER) setYear(value);
                }}
              >
                <SelectTrigger className="h-8 w-[104px] rounded-full px-3 text-xs">
                  <SelectValue placeholder="이전 연도" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={OLDER_YEAR_PLACEHOLDER} disabled>
                    이전 연도
                  </SelectItem>
                  {olderYears.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
          </div>
        ) : null}

        {tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((item) => (
              <button key={item} type="button" onClick={() => setTag(tag === item ? "all" : item)}>
                <Badge variant={tag === item ? "default" : "outline"}>#{item}</Badge>
              </button>
            ))}
          </div>
        ) : null}

        {hasFilter ? (
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground underline"
          >
            <X className="h-3 w-3" />
            필터 초기화
          </button>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={hasFilter ? EMPTY.filterZero.title : EMPTY.galleryNoAlbums.title}
          description={hasFilter ? "검색어나 필터를 바꿔보세요." : EMPTY.galleryNoAlbums.cta}
        />
      ) : (
        <AlbumGrid albums={filtered} />
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      variant={active ? "default" : "outline"}
      size="sm"
      onClick={onClick}
      className={cn("h-8 shrink-0 rounded-full px-3 text-xs", active && "shadow-none")}
    >
      {children}
    </Button>
  );
}

function getAlbumYear(album: AlbumRow): string | null {
  return album.event_date?.slice(0, 4) ?? null;
}

function getAlbumTags(album: AlbumRow): string[] {
  return album.hashtags ?? [];
}

function getYears(albums: AlbumRow[]) {
  return [
    ...new Set(
      albums
        .map((album) => getAlbumYear(album))
        .filter((value): value is string => Boolean(value)),
    ),
  ].sort((a, b) => Number(b) - Number(a));
}

function getTopTags(albums: AlbumRow[]) {
  const counts = new Map<string, number>();
  for (const album of albums) {
    for (const tag of getAlbumTags(album)) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, VISIBLE_TAG_COUNT)
    .map(([value]) => value);
}
