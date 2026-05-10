"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import { IconArrowsExchange } from "@tabler/icons-react";
import { useMutation, useQuery } from "convex/react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { H2, Muted } from "@/components/ui/typography";
import { CreateLabelDialog } from "@/features/autopilot/components/labels/create-label-dialog";
import {
  LabelsList,
  type LabelWithUsage,
} from "@/features/autopilot/components/labels/labels-list";

export default function LabelsPageClient() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const org = useQuery(api.organizations.queries.getBySlug, { slug: orgSlug });
  const membership = useQuery(
    api.organizations.members.getMembership,
    org?._id ? { organizationId: org._id } : "skip"
  );
  const isAdmin = membership?.role === "admin" || membership?.role === "owner";

  const labels = useQuery(
    api.autopilot.queries.labels.listLabelsWithCounts,
    org?._id && isAdmin ? { organizationId: org._id } : "skip"
  );

  if (org === undefined) {
    return <LabelsPageSkeleton />;
  }

  if (!org) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-6">
        <div className="text-center">
          <H2 variant="card">Organization not found</H2>
          <Muted className="mt-2">
            The organization you&apos;re looking for doesn&apos;t exist.
          </Muted>
        </div>
      </div>
    );
  }

  if (membership === undefined) {
    return <LabelsPageSkeleton />;
  }

  if (!isAdmin) {
    return (
      <div className="space-y-6 p-6">
        <H2 variant="card">Labels</H2>
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>Admins only</EmptyTitle>
            <EmptyDescription>
              Ask an organization admin or owner to manage labels.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  const labelsList: readonly LabelWithUsage[] = labels ?? [];

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <H2 variant="card">Labels</H2>
          <Muted className="mt-1">
            Org-wide labels for grouping tasks, stories, and bugs.
          </Muted>
        </div>
        <div className="flex items-center gap-2">
          <MigrateTagsButton organizationId={org._id} />
          <CreateLabelDialog
            existingLabels={labelsList}
            organizationId={org._id}
          />
        </div>
      </div>

      {labels === undefined ? (
        <LabelsListSkeleton />
      ) : (
        <LabelsList labels={labelsList} />
      )}
    </div>
  );
}

function LabelsPageSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <Skeleton className="h-8 w-48" />
      <LabelsListSkeleton />
    </div>
  );
}

function LabelsListSkeleton() {
  return (
    <div className="space-y-2 rounded-lg border p-3">
      {Array.from({ length: 6 }, (_, index) => (
        <Skeleton
          className="h-10 w-full rounded-md"
          key={`label-row-skeleton-${String(index)}`}
        />
      ))}
    </div>
  );
}

interface MigrateTagsButtonProps {
  organizationId: import("@reflet/backend/convex/_generated/dataModel").Id<"organizations">;
}

interface MigrationTotals {
  labelsCreated: number;
  linksCreated: number;
  migrated: number;
}

const MIGRATION_BATCH_SAFETY = 50;

const formatMigrationToast = (totals: MigrationTotals): string => {
  const tasksLabel = totals.migrated === 1 ? "task" : "tasks";
  const labelsLabel = totals.labelsCreated === 1 ? "label" : "labels";
  const linksLabel = totals.linksCreated === 1 ? "link" : "links";
  return `Migrated ${totals.migrated} ${tasksLabel} — ${totals.labelsCreated} new ${labelsLabel}, ${totals.linksCreated} ${linksLabel}`;
};

function MigrateTagsButton({ organizationId }: MigrateTagsButtonProps) {
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const migrate = useMutation(
    api.autopilot.mutations.labels.migrateTagsToLabels
  );

  const runMigration = async (): Promise<MigrationTotals> => {
    const totals: MigrationTotals = {
      labelsCreated: 0,
      linksCreated: 0,
      migrated: 0,
    };
    for (let attempt = 0; attempt < MIGRATION_BATCH_SAFETY; attempt += 1) {
      const result = await migrate({ organizationId });
      totals.migrated += result.migrated;
      totals.labelsCreated += result.labelsCreated;
      totals.linksCreated += result.linksCreated;
      if (result.migrated === 0) {
        break;
      }
    }
    return totals;
  };

  const handleRun = async () => {
    setRunning(true);
    try {
      const totals = await runMigration();
      if (totals.migrated === 0) {
        toast.success("No legacy tags to migrate");
      } else {
        toast.success(formatMigrationToast(totals));
      }
      setOpen(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Migration failed";
      toast.error(message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <AlertDialog onOpenChange={setOpen} open={open}>
      <AlertDialogTrigger
        render={
          <Button className="gap-2" size="sm" variant="outline">
            <IconArrowsExchange className="size-4" />
            Migrate tags to labels
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Convert legacy tags to labels?</AlertDialogTitle>
          <AlertDialogDescription>
            For every work item with free-form tags, this creates matching
            labels (or reuses existing ones), links them, then clears the tag
            field. Safe to run repeatedly.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={running}
            onClick={handleRun}
            type="button"
          >
            {running ? "Migrating…" : "Run migration"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
