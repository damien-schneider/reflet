"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Doc, Id } from "@reflet/backend/convex/_generated/dataModel";
import { IconChevronRight } from "@tabler/icons-react";
import { useQuery } from "convex/react";
import Link from "next/link";

import { cn } from "@/lib/utils";

const PARENT_CHAIN_MAX_DEPTH = 5;

export function ParentBreadcrumb({
  orgSlug,
  parentId,
}: {
  orgSlug: string;
  parentId: Id<"autopilotWorkItems"> | null;
}) {
  const chain = useParentChain(parentId);
  if (chain.length === 0) {
    return null;
  }
  return (
    <nav
      aria-label="Parent chain"
      className="flex flex-wrap items-center gap-1 text-muted-foreground text-xs"
    >
      {chain.map((ancestor, index) => (
        <span className="inline-flex items-center gap-1" key={ancestor._id}>
          <Link
            className="rounded-sm px-1 py-0.5 font-medium transition-colors hover:bg-muted hover:text-foreground"
            href={`/dashboard/${orgSlug}/tasks/${ancestor._id}`}
            prefetch
          >
            {ancestor.identifier ? (
              <span className="font-mono">{ancestor.identifier}</span>
            ) : null}
            <span className={cn(ancestor.identifier && "ml-1.5")}>
              {ancestor.title}
            </span>
          </Link>
          {index < chain.length - 1 ? (
            <IconChevronRight aria-hidden className="size-3" />
          ) : null}
        </span>
      ))}
    </nav>
  );
}

function useParentChain(
  parentId: Id<"autopilotWorkItems"> | null
): Doc<"autopilotWorkItems">[] {
  const a0 = useQuery(
    api.autopilot.queries.work.getWorkItem,
    parentId ? { workItemId: parentId } : "skip"
  );
  const a1 = useQuery(
    api.autopilot.queries.work.getWorkItem,
    a0?.parentId ? { workItemId: a0.parentId } : "skip"
  );
  const a2 = useQuery(
    api.autopilot.queries.work.getWorkItem,
    a1?.parentId ? { workItemId: a1.parentId } : "skip"
  );
  const a3 = useQuery(
    api.autopilot.queries.work.getWorkItem,
    a2?.parentId ? { workItemId: a2.parentId } : "skip"
  );
  const a4 = useQuery(
    api.autopilot.queries.work.getWorkItem,
    a3?.parentId ? { workItemId: a3.parentId } : "skip"
  );

  return [a4, a3, a2, a1, a0]
    .filter((entry): entry is Doc<"autopilotWorkItems"> => Boolean(entry))
    .slice(-PARENT_CHAIN_MAX_DEPTH);
}
