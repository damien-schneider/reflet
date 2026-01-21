"use client";

import { ArrowLeft } from "@phosphor-icons/react";
import { api } from "@reflet-v2/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

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
      <div className="flex items-center gap-2 rounded-lg border bg-background px-2.5 py-1 shadow-md">
        <span className="whitespace-nowrap text-muted-foreground text-xs">
          You are in the public view
        </span>
        <Link href={`/dashboard/${orgSlug}`}>
          <Button className="h-6" size="xs" variant="outline">
            <ArrowLeft className="mr-1 h-3 w-3" />
            <span className="hidden sm:inline">Dashboard</span>
            <span className="sm:hidden">Dash</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}
