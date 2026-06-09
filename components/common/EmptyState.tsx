import * as React from "react";

import { Inbox } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * 빈 상태 공통 컴포넌트 (§11 4상태 / 부록 D).
 * 빈 상태 3종(데이터 없음/검색 0건/필터 0건)을 lib/messages.EMPTY 상수로 받아 표시한다.
 */
export interface EmptyStateProps {
  title: string;
  /** 보조 설명 또는 CTA 문구. */
  description?: string;
  icon?: React.ReactNode;
  /** 액션 버튼(선택). */
  action?: { label: string; onClick?: () => void; href?: string };
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-12 text-center",
        className,
      )}
    >
      <div className="text-muted-foreground">
        {icon ?? <Inbox className="h-10 w-10" aria-hidden />}
      </div>
      <div className="space-y-1">
        <p className="font-medium">{title}</p>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? (
        action.href ? (
          <Button asChild variant="outline" size="sm">
            <a href={action.href}>{action.label}</a>
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={action.onClick}>
            {action.label}
          </Button>
        )
      ) : null}
    </div>
  );
}
