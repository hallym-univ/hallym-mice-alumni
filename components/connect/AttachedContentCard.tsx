import type { ReactNode } from "react";

import Link from "next/link";

import {
  BriefcaseBusiness,
  ExternalLink,
  FileText,
  Images,
  Link2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface AttachedContentPreview {
  href: string;
  kindLabel: string;
  title: string;
  description?: string | null;
}

export function AttachedContentCard({
  item,
  action,
  className,
  compact = false,
}: {
  item: AttachedContentPreview;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  const isInternal = item.href.startsWith("/");
  const Icon = getAttachmentIcon(item.href);
  const description = item.description?.trim();
  const content = (
    <Card
      className={cn(
        "flex items-center transition-colors",
        compact ? "gap-2.5 rounded-md p-2 shadow-none" : "gap-3 p-3",
        isInternal ? "hover:bg-accent/40" : "hover:bg-accent/30",
        className,
      )}
    >
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground",
          compact ? "h-8 w-8" : "h-10 w-10",
        )}
      >
        <Icon className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
      </span>
      <div className="min-w-0 flex-1">
        {compact ? (
          <p className="text-[11px] text-muted-foreground">{item.kindLabel}</p>
        ) : (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span>첨부</span>
            <span aria-hidden="true">·</span>
            <Badge variant="secondary" className="h-5 px-1.5 text-[11px]">
              {item.kindLabel}
            </Badge>
          </div>
        )}
        <p
          className={cn(
            "line-clamp-1 font-medium leading-snug",
            compact ? "mt-0.5 text-xs" : "mt-1 text-sm",
          )}
        >
          {item.title}
        </p>
        {description && !compact ? (
          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {action ? (
        <div className="shrink-0">{action}</div>
      ) : isInternal ? null : (
        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      )}
    </Card>
  );

  if (action) return content;

  return isInternal ? (
    <Link href={item.href} className="block" aria-label={`${item.kindLabel} 열기`}>
      {content}
    </Link>
  ) : (
    <a
      href={item.href}
      target="_blank"
      rel="noopener noreferrer"
      className="block"
      aria-label={`${item.kindLabel} 열기`}
    >
      {content}
    </a>
  );
}

function getAttachmentIcon(href: string) {
  if (href.startsWith("/content/")) return FileText;
  if (href.startsWith("/jobs/")) return BriefcaseBusiness;
  if (href.startsWith("/albums/")) return Images;
  return Link2;
}
