# Unified Release View Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a shared release view component used by both public and admin changelog pages with sticky version headers and spacious mobile-first design.

**Architecture:** Replace `AdminReleaseCard` and inline public rendering with a unified `ReleaseTimeline` component. Uses context props (`isAdmin`) to conditionally show admin controls. Sticky version headers per release section with intersection observer.

**Tech Stack:** React, Tailwind CSS, Phosphor Icons, date-fns, DOMPurify

---

## Task 1: Create ReleaseItem Component

**Files:**
- Create: `apps/web/src/features/changelog/components/release-item.tsx`

**Step 1: Create the release item component with sticky header**

```tsx
"use client";

import {
  Calendar,
  Check,
  DotsThreeVertical,
  Eye,
  EyeSlash,
  PencilSimple,
  Trash,
} from "@phosphor-icons/react";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { format } from "date-fns";
import DOMPurify from "isomorphic-dompurify";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownList,
  DropdownListContent,
  DropdownListItem,
  DropdownListSeparator,
  DropdownListTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface LinkedFeedback {
  _id: Id<"feedback">;
  title: string;
}

interface Release {
  _id: Id<"releases">;
  version?: string;
  title: string;
  description?: string;
  publishedAt?: number;
  _creationTime: number;
  feedback?: LinkedFeedback[];
}

interface ReleaseItemProps {
  release: Release;
  orgSlug: string;
  isAdmin?: boolean;
  onPublish?: () => void;
  onUnpublish?: () => void;
  onDelete?: () => void;
}

export function ReleaseItem({
  release,
  orgSlug,
  isAdmin = false,
  onPublish,
  onUnpublish,
  onDelete,
}: ReleaseItemProps) {
  const isPublished = release.publishedAt !== undefined;
  const publishDate = release.publishedAt
    ? format(release.publishedAt, "MMMM d, yyyy")
    : null;

  return (
    <article className="relative">
      {/* Sticky version header */}
      <div
        className={cn(
          "sticky top-0 z-10 -mx-4 px-4 py-3 backdrop-blur-sm",
          "bg-background/80 border-b border-transparent",
          "md:-mx-0 md:px-0"
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {release.version && (
              <Badge
                className="font-mono text-sm px-3 py-1"
                variant="outline"
              >
                {release.version}
              </Badge>
            )}
            {!isPublished && (
              <Badge variant="secondary">
                <EyeSlash className="mr-1 h-3 w-3" />
                Draft
              </Badge>
            )}
            {publishDate && (
              <span className="flex items-center gap-1.5 text-muted-foreground text-sm">
                <Calendar className="h-4 w-4" />
                <time
                  dateTime={
                    release.publishedAt
                      ? new Date(release.publishedAt).toISOString()
                      : undefined
                  }
                >
                  {publishDate}
                </time>
              </span>
            )}
          </div>

          {/* Admin actions */}
          {isAdmin && (
            <div className="flex items-center gap-2">
              <Link href={`/dashboard/${orgSlug}/changelog/${release._id}/edit`}>
                <Button size="sm" variant="ghost">
                  <PencilSimple className="h-4 w-4" />
                  <span className="ml-1.5 hidden sm:inline">Edit</span>
                </Button>
              </Link>
              <DropdownList>
                <DropdownListTrigger
                  render={(props: React.ComponentProps<"button">) => (
                    <Button {...props} size="icon" variant="ghost">
                      <DotsThreeVertical className="h-4 w-4" />
                    </Button>
                  )}
                />
                <DropdownListContent align="end">
                  {isPublished ? (
                    <DropdownListItem onClick={onUnpublish}>
                      <EyeSlash className="mr-2 h-4 w-4" />
                      Unpublish
                    </DropdownListItem>
                  ) : (
                    <DropdownListItem onClick={onPublish}>
                      <Eye className="mr-2 h-4 w-4" />
                      Publish
                    </DropdownListItem>
                  )}
                  <DropdownListSeparator />
                  <DropdownListItem
                    className="text-destructive"
                    onClick={onDelete}
                  >
                    <Trash className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownListItem>
                </DropdownListContent>
              </DropdownList>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className={cn("pt-6 pb-12", !isPublished && "opacity-70")}>
        <h2 className="mb-4 font-semibold text-2xl md:text-3xl">
          {release.title}
        </h2>

        {release.description && (
          <div
            className="prose prose-neutral dark:prose-invert max-w-none"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized changelog content
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(release.description),
            }}
          />
        )}

        {/* Shipped features */}
        {release.feedback && release.feedback.length > 0 && (
          <div className="mt-8">
            <h3 className="mb-3 font-medium text-muted-foreground text-sm uppercase tracking-wide">
              Shipped Features
            </h3>
            <ul className="space-y-2">
              {release.feedback.filter(Boolean).map((item) => (
                <li
                  className="flex items-center gap-2 text-sm"
                  key={item._id}
                >
                  <Check className="h-4 w-4 shrink-0 text-olive-500" />
                  <span>{item.title}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </article>
  );
}
```

**Step 2: Verify the file was created**

Run: `ls -la apps/web/src/features/changelog/components/release-item.tsx`

---

## Task 2: Create ReleaseTimeline Component

**Files:**
- Create: `apps/web/src/features/changelog/components/release-timeline.tsx`

**Step 1: Create the timeline container component**

```tsx
"use client";

import { Megaphone } from "@phosphor-icons/react";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { Card, CardContent } from "@/components/ui/card";
import { H3, Muted } from "@/components/ui/typography";
import { ReleaseItem } from "./release-item";

interface LinkedFeedback {
  _id: Id<"feedback">;
  title: string;
}

interface Release {
  _id: Id<"releases">;
  version?: string;
  title: string;
  description?: string;
  publishedAt?: number;
  _creationTime: number;
  feedback?: LinkedFeedback[];
}

interface ReleaseTimelineProps {
  releases: Release[];
  orgSlug: string;
  isAdmin?: boolean;
  onPublish?: (id: Id<"releases">) => void;
  onUnpublish?: (id: Id<"releases">) => void;
  onDelete?: (release: Release) => void;
  emptyAction?: React.ReactNode;
}

export function ReleaseTimeline({
  releases,
  orgSlug,
  isAdmin = false,
  onPublish,
  onUnpublish,
  onDelete,
  emptyAction,
}: ReleaseTimelineProps) {
  if (!releases || releases.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Megaphone className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <H3 className="mb-2" variant="card">
            No releases yet
          </H3>
          <Muted className="mb-4">
            {isAdmin
              ? "Create your first release to share product updates."
              : "Check back soon for product updates."}
          </Muted>
          {emptyAction}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="divide-y divide-border">
      {releases.map((release) => (
        <ReleaseItem
          isAdmin={isAdmin}
          key={release._id}
          onDelete={() => onDelete?.(release)}
          onPublish={() => onPublish?.(release._id)}
          onUnpublish={() => onUnpublish?.(release._id)}
          orgSlug={orgSlug}
          release={release}
        />
      ))}
    </div>
  );
}
```

**Step 2: Verify the file was created**

Run: `ls -la apps/web/src/features/changelog/components/release-timeline.tsx`

---

## Task 3: Update Admin Changelog Page

**Files:**
- Modify: `apps/web/app/dashboard/[orgSlug]/changelog/page.tsx`

**Step 1: Replace AdminReleaseCard usage with ReleaseTimeline**

Replace the entire file content:

```tsx
"use client";

import { GithubLogo, Plus } from "@phosphor-icons/react";
import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { use, useState } from "react";

import { Button } from "@/components/ui/button";
import { H1, Text } from "@/components/ui/typography";
import { DeleteReleaseDialog } from "@/features/changelog/components/delete-release-dialog";
import { ReleaseTimeline } from "@/features/changelog/components/release-timeline";

export default function ChangelogPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  const org = useQuery(api.organizations.getBySlug, { slug: orgSlug });
  const releases = useQuery(
    api.releases.list,
    org?._id ? { organizationId: org._id as Id<"organizations"> } : "skip"
  );
  const currentMember = useQuery(
    api.members.getCurrentMember,
    org?._id ? { organizationId: org._id as Id<"organizations"> } : "skip"
  );
  const githubStatus = useQuery(
    api.github.getConnectionStatus,
    org?._id ? { organizationId: org._id as Id<"organizations"> } : "skip"
  );
  const deleteRelease = useMutation(api.changelog_actions.remove);
  const publishRelease = useMutation(api.changelog_actions.publish);
  const unpublishRelease = useMutation(api.changelog_actions.unpublish);

  const [deletingRelease, setDeletingRelease] = useState<
    NonNullable<typeof releases>[number] | null
  >(null);

  const isAdmin =
    currentMember?.role === "admin" || currentMember?.role === "owner";

  if (!org) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h2 className="font-semibold text-lg">Organization not found</h2>
          <p className="mt-2 text-muted-foreground">
            The organization you&apos;re looking for doesn&apos;t exist.
          </p>
        </div>
      </div>
    );
  }

  const handleDeleteRelease = async () => {
    if (!deletingRelease) {
      return;
    }
    await deleteRelease({ id: deletingRelease._id });
    setDeletingRelease(null);
  };

  const handlePublish = async (releaseId: Id<"releases">) => {
    await publishRelease({ id: releaseId });
  };

  const handleUnpublish = async (releaseId: Id<"releases">) => {
    await unpublishRelease({ id: releaseId });
  };

  return (
    <div className="admin-container">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <H1>Changelog</H1>
          <Text variant="bodySmall">
            Manage release notes and product updates
          </Text>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            {githubStatus?.isConnected ? (
              <Link href={`/dashboard/${orgSlug}/settings/github`}>
                <Button variant="outline">
                  <GithubLogo className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Sync from GitHub</span>
                  <span className="sm:hidden">Sync</span>
                </Button>
              </Link>
            ) : (
              <Link href={`/dashboard/${orgSlug}/settings/github`}>
                <Button variant="outline">
                  <GithubLogo className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Connect GitHub</span>
                  <span className="sm:hidden">GitHub</span>
                </Button>
              </Link>
            )}
            <Link href={`/dashboard/${orgSlug}/changelog/new`}>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Create Release</span>
                <span className="sm:hidden">New</span>
              </Button>
            </Link>
          </div>
        )}
      </div>

      <ReleaseTimeline
        emptyAction={
          isAdmin && (
            <Link href={`/dashboard/${orgSlug}/changelog/new`}>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Release
              </Button>
            </Link>
          )
        }
        isAdmin={isAdmin}
        onDelete={setDeletingRelease}
        onPublish={handlePublish}
        onUnpublish={handleUnpublish}
        orgSlug={orgSlug}
        releases={releases ?? []}
      />

      {deletingRelease && (
        <DeleteReleaseDialog
          onClose={() => setDeletingRelease(null)}
          onConfirm={handleDeleteRelease}
          open={Boolean(deletingRelease)}
        />
      )}
    </div>
  );
}
```

**Step 2: Verify the changes**

Run: `bun x ultracite check apps/web/app/dashboard/[orgSlug]/changelog/page.tsx`

---

## Task 4: Update Public Changelog Page

**Files:**
- Modify: `apps/web/app/[orgSlug]/changelog/page-client.tsx`

**Step 1: Replace inline rendering with ReleaseTimeline**

Replace the entire file content:

```tsx
"use client";

import { Bell } from "@phosphor-icons/react";
import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { use } from "react";

import { Button } from "@/components/ui/button";
import { H1, Lead } from "@/components/ui/typography";
import { ChangelogSubscribe } from "@/features/changelog/components/changelog-subscribe";
import { ReleaseTimeline } from "@/features/changelog/components/release-timeline";

export default function PublicChangelogPageClient({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  const org = useQuery(api.organizations.getBySlug, { slug: orgSlug });
  const releases = useQuery(
    api.changelog.listPublished,
    org?._id ? { organizationId: org._id as Id<"organizations"> } : "skip"
  );

  if (!org) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <H1 variant="page">Changelog</H1>
          <Lead className="mt-2">
            Stay up to date with the latest updates and improvements.
          </Lead>
        </div>
        <ChangelogSubscribe
          className="shrink-0"
          organizationId={org._id as Id<"organizations">}
        />
      </div>

      <ReleaseTimeline
        emptyAction={
          <Button onClick={() => {}} variant="outline">
            <Bell className="mr-2 h-4 w-4" />
            Subscribe for updates
          </Button>
        }
        isAdmin={false}
        orgSlug={orgSlug}
        releases={releases ?? []}
      />
    </div>
  );
}
```

**Step 2: Verify the changes**

Run: `bun x ultracite check apps/web/app/[orgSlug]/changelog/page-client.tsx`

---

## Task 5: Clean Up Unused Files

**Files:**
- Delete: `apps/web/src/features/changelog/components/admin-release-card.tsx`
- Delete: `apps/web/src/features/changelog/components/release-card.tsx`
- Delete: `apps/web/src/features/changelog/components/release-list.tsx`

**Step 1: Remove unused components**

```bash
rm apps/web/src/features/changelog/components/admin-release-card.tsx
rm apps/web/src/features/changelog/components/release-card.tsx
rm apps/web/src/features/changelog/components/release-list.tsx
```

**Step 2: Verify removal**

Run: `ls apps/web/src/features/changelog/components/`

Expected: Only `changelog-subscribe.tsx`, `delete-release-dialog.tsx`, `release-editor.tsx`, `release-editor.test.tsx`, `release-item.tsx`, `release-timeline.tsx`

---

## Task 6: Run Linting and Tests

**Step 1: Run Ultracite fix**

```bash
bun x ultracite fix
```

**Step 2: Run type check**

```bash
cd apps/web && bun run typecheck
```

**Step 3: Verify the app builds**

```bash
cd apps/web && bun run build
```

---

## Task 7: Manual Testing Checklist

- [ ] Visit `/dashboard/{orgSlug}/changelog` - verify admin view shows sticky headers, edit buttons, publish/unpublish dropdowns
- [ ] Visit `/{orgSlug}/changelog` - verify public view shows releases without admin controls
- [ ] Test mobile responsiveness - sticky headers should work, buttons should collapse appropriately
- [ ] Test publish/unpublish from admin view
- [ ] Test delete from admin view
- [ ] Verify draft releases show with reduced opacity and "Draft" badge
