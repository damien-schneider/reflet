"use client";

import { ButtonLink } from "@ctrl-ui/react/ui/button";
import { ArrowLeft } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import Link from "next/link";

interface PublicViewToolbarProps {
  orgSlug: string;
}

export function PublicViewToolbar({ orgSlug }: PublicViewToolbarProps) {
  const org = useQuery(api.organizations.queries.getBySlug, { slug: orgSlug });

  const isTeamMember =
    org?.role === "owner" || org?.role === "admin" || org?.role === "member";

  if (!isTeamMember) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--mobile-nav-offset,env(safe-area-inset-bottom))+4.25rem)] z-50 flex justify-start px-4 md:bottom-4 md:justify-center">
      <ButtonLink
        className="pointer-events-auto shadow-(--reflet-popup-shadow)"
        render={<Link href={`/dashboard/${orgSlug}`} prefetch />}
        size="sm"
        variant="surface"
      >
        <ArrowLeft data-icon="inline-start" />
        <span>Dashboard</span>
        <span className="hidden text-muted-foreground sm:inline">
          Public view
        </span>
      </ButtonLink>
    </div>
  );
}
