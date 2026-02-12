"use client";

import { GithubLogo, PaperPlaneTilt } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PublishConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isSubmitting: boolean;
  title: string;
  version: string;
  organizationId: Id<"organizations">;
  orgSlug: string;
}

export function PublishConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  isSubmitting,
  title,
  version,
  organizationId,
  orgSlug,
}: PublishConfirmDialogProps) {
  const orgData = useQuery(api.organizations.get, {
    id: organizationId,
  });
  const githubStatus = useQuery(api.github.getConnectionStatus, {
    organizationId,
  });
  const subscriberCount = useQuery(
    api.changelog_subscriptions.getSubscriberCount,
    { organizationId }
  );

  const pushToGithub =
    orgData?.changelogSettings?.pushToGithubOnPublish === true;
  const hasGithub = githubStatus?.isConnected && githubStatus?.hasRepository;
  const willPushToGithub = pushToGithub && hasGithub;
  const subCount = subscriberCount ?? 0;

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Publish Release</DialogTitle>
          <DialogDescription>
            Review before publishing to your changelog
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* Release info */}
          <div className="rounded-lg border p-3">
            <p className="font-medium text-sm">{title || "Untitled Release"}</p>
            {version && (
              <Badge className="mt-1" variant="outline">
                {version}
              </Badge>
            )}
          </div>

          {/* What will happen */}
          <div className="space-y-2">
            <p className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
              On publish
            </p>

            <div className="flex items-center gap-2 text-sm">
              <PaperPlaneTilt className="h-4 w-4 text-muted-foreground" />
              <span>
                {subCount > 0
                  ? `Notify ${subCount} subscriber${subCount === 1 ? "" : "s"} via email`
                  : "No subscribers to notify"}
              </span>
            </div>

            {willPushToGithub && (
              <div className="flex items-center gap-2 text-sm">
                <GithubLogo className="h-4 w-4 text-muted-foreground" />
                <span>
                  Create GitHub Release on {githubStatus?.repositoryFullName}
                </span>
              </div>
            )}

            {pushToGithub && !hasGithub && (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <GithubLogo className="h-4 w-4" />
                <span>
                  GitHub push enabled but no repo connected.{" "}
                  <Link
                    className="underline hover:text-foreground"
                    href={`/dashboard/${orgSlug}/settings/github`}
                  >
                    Connect repository
                  </Link>
                </span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={() => onOpenChange(false)}
            size="sm"
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            disabled={isSubmitting}
            onClick={onConfirm}
            size="sm"
            type="button"
          >
            Publish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
