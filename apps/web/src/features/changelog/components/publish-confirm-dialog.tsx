"use client";

import { Badge } from "@ctrl-ui/react/ui/badge";
import { Button } from "@ctrl-ui/react/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@ctrl-ui/react/ui/dialog";
import { Spinner } from "@ctrl-ui/react/ui/spinner";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@ctrl-ui/react/ui/tabs";
import {
  CalendarBlank,
  CheckCircle,
  GithubLogo,
  PaperPlaneTilt,
} from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { UNTITLED_RELEASE_TITLE } from "@reflet/backend/convex/changelog/release_text";
import { useQuery } from "convex/react";
import { format } from "date-fns";
import Link from "next/link";
import { useState } from "react";
import { STATUS_CONFIG } from "@/lib/constants";

import type { FeedbackLinkStatus } from "./feedback-section-header";
import { SchedulePicker } from "./schedule-picker";

type PublishMode = "now" | "schedule";

function subscriberSummary(count: number | undefined): string {
  if (count === undefined) {
    return "Counting subscribers…";
  }
  if (count === 0) {
    return "No subscribers to notify";
  }
  return `Notify ${count} subscriber${count === 1 ? "" : "s"} via email`;
}

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
  const [mode, setMode] = useState<PublishMode>("now");
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>();
  const [isScheduleValid, setIsScheduleValid] = useState(false);

  const handleScheduledDateChange = (date: Date | undefined) => {
    setScheduledDate(date);
    setIsScheduleValid(date !== undefined && date.getTime() > Date.now());
  };

  const handleConfirm = () => {
    if (mode === "now" || !onSchedule) {
      onConfirm();
      return;
    }
    if (scheduledDate && scheduledDate.getTime() > Date.now()) {
      onSchedule(scheduledDate.getTime());
      return;
    }
    setIsScheduleValid(false);
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-105">
        <DialogHeader>
          <DialogTitle>Publish release</DialogTitle>
          <DialogDescription>
            Here’s what happens when it goes live.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <PublishReleaseSummary title={title} version={version} />

          <PublishModeTabs
            isScheduleValid={isScheduleValid}
            isSubmitting={isSubmitting}
            mode={mode}
            onModeChange={setMode}
            onScheduledDateChange={handleScheduledDateChange}
            scheduledDate={scheduledDate}
          />

          <PublishEffects
            feedbackLinkStatus={feedbackLinkStatus}
            linkedFeedbackCount={linkedFeedbackCount}
            mode={mode}
            organizationId={organizationId}
            orgSlug={orgSlug}
          />
        </div>

        <DialogFooter>
          <Button
            disabled={isSubmitting}
            onClick={() => onOpenChange(false)}
            type="button"
            variant="surface"
          >
            Cancel
          </Button>
          <Button
            disabled={isSubmitting || (mode === "schedule" && !isScheduleValid)}
            onClick={handleConfirm}
            tone="primary"
            type="button"
            variant="solid"
          >
            <SubmitSpinner isSubmitting={isSubmitting} />
            {mode === "schedule" ? "Schedule" : "Publish"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PublishReleaseSummary({
  title,
  version,
}: {
  title: string;
  version: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border p-3">
      <p className="min-w-0 text-pretty font-medium text-sm">
        {title || UNTITLED_RELEASE_TITLE}
      </p>
      {version && (
        <Badge className="shrink-0 tabular-nums" size="sm" variant="outline">
          {version}
        </Badge>
      )}
    </div>
  );
}

interface PublishEffectsProps {
  feedbackLinkStatus: FeedbackLinkStatus;
  linkedFeedbackCount: number;
  mode: PublishMode;
  organizationId: Id<"organizations">;
  orgSlug: string;
}

function PublishEffects({
  feedbackLinkStatus,
  linkedFeedbackCount,
  mode,
  organizationId,
  orgSlug,
}: PublishEffectsProps) {
  const orgData = useQuery(api.organizations.queries.get, {
    id: organizationId,
  });
  const githubStatus = useQuery(
    api.integrations.github.queries.getConnectionStatus,
    { organizationId }
  );
  const subscriberCount = useQuery(
    api.changelog.subscriptions.getSubscriberCount,
    { organizationId }
  );

  const pushToGithub = Boolean(
    orgData?.role && orgData.changelogSettings?.pushToGithubOnPublish
  );
  const hasGithub = githubStatus?.isConnected && githubStatus?.hasRepository;
  const willMoveFeedback =
    linkedFeedbackCount > 0 && feedbackLinkStatus !== "keep";

  return (
    <div className="space-y-2">
      <p className="font-medium text-muted-foreground text-xs">
        {mode === "schedule" ? "When it goes live" : "On publish"}
      </p>

      <div className="flex items-center gap-2 text-sm">
        <PaperPlaneTilt
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground"
        />
        <span className="tabular-nums">
          {subscriberSummary(subscriberCount)}
        </span>
      </div>

      {pushToGithub && hasGithub && (
        <div className="flex items-center gap-2 text-sm">
          <GithubLogo
            aria-hidden="true"
            className="size-4 shrink-0 text-muted-foreground"
          />
          <span className="min-w-0 break-words">
            Create GitHub Release on {githubStatus?.repositoryFullName}
          </span>
        </div>
      )}

      {willMoveFeedback && (
        <div className="flex items-center gap-2 text-sm">
          <CheckCircle
            aria-hidden="true"
            className="size-4 shrink-0 text-muted-foreground"
          />
          <span className="tabular-nums">
            Move {linkedFeedbackCount} linked feedback item
            {linkedFeedbackCount === 1 ? "" : "s"} to{" "}
            <strong>{STATUS_CONFIG[feedbackLinkStatus].label}</strong>
          </span>
        </div>
      )}

      {pushToGithub && !hasGithub && (
        <GithubNotConnectedNotice orgSlug={orgSlug} />
      )}
    </div>
  );
}

function GithubNotConnectedNotice({ orgSlug }: { orgSlug: string }) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground text-sm">
      <GithubLogo aria-hidden="true" className="size-4 shrink-0" />
      <span>
        GitHub push enabled but no repo connected.{" "}
        <Link
          className="underline underline-offset-4 hover:text-foreground"
          href={`/dashboard/${orgSlug}/project/github`}
        >
          Connect repository
        </Link>
      </span>
    </div>
  );
}

function SubmitSpinner({ isSubmitting }: { isSubmitting: boolean }) {
  return isSubmitting ? <Spinner data-icon="inline-start" size="xs" /> : null;
}

interface PublishModeTabsProps {
  isScheduleValid: boolean;
  isSubmitting: boolean;
  mode: PublishMode;
  onModeChange: (mode: PublishMode) => void;
  onScheduledDateChange: (date: Date | undefined) => void;
  scheduledDate: Date | undefined;
}

function PublishModeTabs({
  isScheduleValid,
  isSubmitting,
  mode,
  onModeChange,
  onScheduledDateChange,
  scheduledDate,
}: PublishModeTabsProps) {
  return (
    <Tabs<PublishMode> onValueChange={onModeChange} value={mode}>
      <TabsList className="grid w-full grid-cols-2">
        <TabsTab value="now">Publish now</TabsTab>
        <TabsTab value="schedule">
          <CalendarBlank aria-hidden="true" className="size-3.5" />
          Schedule
        </TabsTab>
      </TabsList>

      <TabsPanel className="mt-3" value="schedule">
        <SchedulePicker
          disabled={isSubmitting}
          onChange={onScheduledDateChange}
          value={scheduledDate}
        />
        {isScheduleValid && scheduledDate && (
          <p className="mt-2 text-muted-foreground text-xs tabular-nums">
            Goes live {format(scheduledDate, "MMM d, yyyy 'at' h:mm a")}
          </p>
        )}
        {!isScheduleValid && scheduledDate && (
          <p className="mt-2 text-destructive-text text-xs" role="alert">
            That time has passed. Pick a later one.
          </p>
        )}
      </TabsPanel>
    </Tabs>
  );
}
