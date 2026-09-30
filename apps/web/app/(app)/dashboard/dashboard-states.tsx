"use client";

import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import { CaretRight } from "@phosphor-icons/react";
import type { api } from "@reflet/backend/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import Link from "next/link";
import { OrgAvatar } from "@/features/organizations/components/org-avatar";
import { OrganizationSwitcher } from "@/features/organizations/components/organization-switcher";

type OrganizationList = FunctionReturnType<
  typeof api.organizations.queries.list
>;

const SKELETON_ROWS = ["first", "second", "third"] as const;

function CenteredScreen({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[calc(100svh-3.5rem)] items-center justify-center p-6">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}

function OrgPickerHeading() {
  return (
    <h1 className="mb-6 text-balance text-center font-display text-2xl tracking-tight">
      Select an organization
    </h1>
  );
}

export function OrgPickerSkeleton() {
  return (
    <CenteredScreen>
      <OrgPickerHeading />
      <div aria-busy="true" className="flex flex-col gap-2">
        <span className="sr-only">Loading organizations…</span>
        {SKELETON_ROWS.map((row) => (
          <Skeleton className="h-16 w-full rounded-xl" key={row} />
        ))}
      </div>
    </CenteredScreen>
  );
}

export function OrgPicker({
  organizations,
}: {
  organizations: OrganizationList;
}) {
  return (
    <CenteredScreen>
      <OrgPickerHeading />
      <nav aria-label="Organizations">
        <ul className="flex flex-col gap-2">
          {organizations.map((org) =>
            org ? (
              <li key={org._id}>
                <Link
                  className="group flex items-center gap-3 rounded-xl bg-card p-3 ring-1 ring-foreground/10 hover:ring-ring"
                  href={`/dashboard/${org.slug}`}
                >
                  <OrgAvatar org={org} size="lg" />
                  <span className="min-w-0 flex-1 truncate font-medium text-sm">
                    {org.name}
                  </span>
                  <CaretRight
                    aria-hidden="true"
                    className="size-4 text-muted-foreground"
                  />
                </Link>
              </li>
            ) : null
          )}
        </ul>
      </nav>
    </CenteredScreen>
  );
}

export function WelcomeState() {
  return (
    <CenteredScreen>
      <h1 className="text-balance text-center font-display text-2xl tracking-tight">
        Welcome to Reflet
      </h1>
      <p className="mt-2 mb-6 text-pretty text-center text-muted-foreground text-sm">
        Create an organization to start collecting feedback.
      </p>
      <OrganizationSwitcher currentOrgSlug={undefined} />
    </CenteredScreen>
  );
}
