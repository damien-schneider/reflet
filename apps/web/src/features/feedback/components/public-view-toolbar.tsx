"use client";

import { ArrowLeft } from "@phosphor-icons/react";
import { api } from "@reflet-v2/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import Link from "next/link";

interface PublicViewToolbarProps {
  orgSlug: string;
}

export function PublicViewToolbar({ orgSlug }: PublicViewToolbarProps) {
  const org = useQuery(api.organizations.getBySlug, { slug: orgSlug });

  // Only show if user is authenticated and is a team member/owner
  const isTeamMember =
    org?.role === "owner" || org?.role === "admin" || org?.role === "member";

  if (!isTeamMember) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-full max-w-fit -translate-x-1/2 px-4 sm:px-0">
      <Link
        className="flex cursor-pointer items-center gap-2 rounded-lg border bg-background px-2.5 py-1 shadow-md transition-colors hover:bg-muted"
        href={`/dashboard/${orgSlug}`}
        prefetch={true}
      >
        <span className="flex items-center gap-1 font-medium text-xs">
          <ArrowLeft className="h-3 w-3" />
          <span className="inline">Dashboard</span>
        </span>
        <span className="whitespace-nowrap text-muted-foreground text-xs">
          You are in the public view
        </span>
      </Link>
    </div>
  );
}
