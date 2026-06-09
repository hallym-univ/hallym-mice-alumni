import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * 로딩 스켈레톤 공통 컴포넌트 (§11 4상태).
 * variant 로 목록 카드 / 텍스트 줄 / 프로필 상세 스켈레톤을 선택한다.
 */
export interface LoadingSkeletonProps {
  variant?: "list" | "lines" | "profile";
  /** list/lines 반복 개수 */
  count?: number;
  className?: string;
}

export function LoadingSkeleton({
  variant = "list",
  count = 4,
  className,
}: LoadingSkeletonProps) {
  if (variant === "lines") {
    return (
      <div className={cn("space-y-2", className)} aria-hidden>
        {Array.from({ length: count }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </div>
    );
  }

  if (variant === "profile") {
    return (
      <div className={cn("space-y-4", className)} aria-hidden>
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        </div>
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  // list (프로필 카드 리스트 스켈레톤)
  return (
    <div className={cn("space-y-3", className)} aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex-row items-center gap-3 space-y-0">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-3 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
