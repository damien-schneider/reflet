"use client";

import {
  CalendarBlank,
  CheckCircle,
  GithubLogo,
  PaperPlaneTilt,
} from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { format } from "date-fns";
import Link from "next/link";
import { useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import type { FeedbackLinkStatus } from "./feedback-section-header";
import { SchedulePicker } from "./schedule-picker";

const STATUS_DISPLAY_LABELS: Record<FeedbackLinkStatus, string> = {
  keep: "Keep current status",
  open: "Open",
  under_review: "Under Review",
  planned: "Planned",
  in_progress: "In Progress",
  completed: "Completed",
  closed: "Closed",
} as const;

interface PublishConfirmDialogProps {
  feedbackLinkStatus?: FeedbackLinkStatus;
  isSubmitting: boolean;
  linkedFeedbackCount?: number;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  onSchedule?: (scheduledAt: number) => void;
  open: boolean;
  organizationId: Id<"organizations">;
  orgSlug: string;
  title: string;
  version: string;
}

export function PublishConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  onSchedule,
  isSubmitting,
  title,
  version,
  organizationId,
  orgSlug,
  linkedFeedbackCount = 0,
  feedbackLinkStatus = "completed",
}: PublishConfirmDialogProps) {
  const [mode, setMode] = useState<"now" | "schedule">("now");
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>();

  const orgData = useQuery(api.organizations.queries.get, {
    id: organizationId,
  });
  const githubStatus = useQuery(
    api.integrations.github.queries.getConnectionStatus,
    {
      organizationId,
    }
  );
  const subscriberCount = useQuery(
    api.changelog.subscriptions.getSubscriberCount,
    { organizationId }
  );

  const pushToGithub =
    orgData?.changelogSettings?.pushToGithubOnPublish === true;
  const hasGithub = githubStatus?.isConnected && githubStatus?.hasRepository;
  const willPushToGithub = pushToGithub && hasGithub;
  const subCount = subscriberCount ?? 0;

  const isScheduleValid = scheduledDate && scheduledDate.getTime() > Date.now();

  const handleConfirm = () => {
    if (mode === "schedule" && isScheduleValid && onSchedule) {
      onSchedule(scheduledDate.getTime());
    } else {
      onConfirm();
    }
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-105">
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

          {/* Publish mode selector */}
          <Tabs
            onValueChange={(v) => setMode(v as "now" | "schedule")}
            value={mode}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="now">Publish Now</TabsTrigger>
              <TabsTrigger value="schedule">
                <CalendarBlank className="mr-1.5 h-3.5 w-3.5" />
                Schedule
              </TabsTrigger>
            </TabsList>

            <TabsContent className="mt-3" value="schedule">
              <SchedulePicker
                disabled={isSubmitting}
                onChange={setScheduledDate}
                value={scheduledDate}
              />
              {isScheduleValid && (
                <p className="mt-2 text-muted-foreground text-xs">
                  Will publish on{" "}
                  {format(scheduledDate, "MMM d, yyyy 'at' h:mm a")}
                </p>
              )}
            </TabsContent>
          </Tabs>

          {/* What will happen */}
          <div className="space-y-2">
            <p className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
              {mode === "schedule" ? "On scheduled publish" : "On publish"}
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

            {linkedFeedbackCount > 0 && feedbackLinkStatus !== "keep" && (
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
                <span>
                  Set {linkedFeedbackCount} linked feedback
                  {linkedFeedbackCount === 1 ? "" : "s"} to{" "}
                  <strong>{STATUS_DISPLAY_LABELS[feedbackLinkStatus]}</strong>
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
            disabled={isSubmitting || (mode === "schedule" && !isScheduleValid)}
            onClick={handleConfirm}
            size="sm"
            type="button"
          >
            {mode === "schedule" ? "Schedule Publish" : "Publish"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
