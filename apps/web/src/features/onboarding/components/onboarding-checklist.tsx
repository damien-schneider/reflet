"use client";

import {
  CaretDown,
  CheckCircle,
  Circle,
  GithubLogo,
  ListChecks,
  PaintBrush,
  PuzzlePiece,
  Tray,
  Users,
} from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { type ReactNode, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

type StepName =
  | "boardCreated"
  | "brandingCustomized"
  | "githubConnected"
  | "widgetInstalled"
  | "teamInvited"
  | "firstFeedbackCreated";

interface Step {
  description: string;
  href: string;
  icon: ReactNode;
  key: StepName;
  label: string;
}

const ICON_SIZE = 18;

function getSteps(orgSlug: string): Step[] {
  return [
    {
      key: "boardCreated",
      label: "Create your feedback board",
      description: "Set up your first feedback board",
      href: `/dashboard/${orgSlug}/settings`,
      icon: <Tray size={ICON_SIZE} />,
    },
    {
      key: "brandingCustomized",
      label: "Customize your branding",
      description: "Add your logo and brand colors",
      href: `/dashboard/${orgSlug}/settings`,
      icon: <PaintBrush size={ICON_SIZE} />,
    },
    {
      key: "firstFeedbackCreated",
      label: "Create your first feedback",
      description: "Add a feedback item to your board",
      href: `/dashboard/${orgSlug}`,
      icon: <Tray size={ICON_SIZE} />,
    },
    {
      key: "githubConnected",
      label: "Connect GitHub",
      description: "Link your GitHub repos for auto-changelogs",
      href: `/dashboard/${orgSlug}/settings`,
      icon: <GithubLogo size={ICON_SIZE} />,
    },
    {
      key: "widgetInstalled",
      label: "Install the widget",
      description: "Embed feedback collection in your app",
      href: `/dashboard/${orgSlug}/settings`,
      icon: <PuzzlePiece size={ICON_SIZE} />,
    },
    {
      key: "teamInvited",
      label: "Invite your team",
      description: "Add team members to collaborate",
      href: `/dashboard/${orgSlug}/members`,
      icon: <Users size={ICON_SIZE} />,
    },
  ];
}

function getStorageKey(orgSlug: string): string {
  return `onboarding-minimized-${orgSlug}`;
}

export function OnboardingChecklist({
  organizationId,
  orgSlug,
}: {
  organizationId: Id<"organizations">;
  orgSlug: string;
}) {
  const progress = useQuery(api.organizations.onboarding.getProgress, {
    organizationId,
  });
  const dismissMutation = useMutation(api.organizations.onboarding.dismiss);
  const syncMutation = useMutation(
    api.organizations.onboarding.syncAutoDetectedProgress
  );

  const [isMinimized, setIsMinimized] = useState(true);
  const [hasSynced, setHasSynced] = useState(false);

  // Initialize minimized state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(getStorageKey(orgSlug));
    // Default to minimized (pill) — only expand if explicitly set to "false"
    setIsMinimized(stored !== "false");
  }, [orgSlug]);

  // Sync auto-detected progress once on mount
  useEffect(() => {
    if (!hasSynced) {
      syncMutation({ organizationId });
      setHasSynced(true);
    }
  }, [hasSynced, organizationId, syncMutation]);

  const toggleMinimized = () => {
    setIsMinimized((prev) => {
      const next = !prev;
      localStorage.setItem(getStorageKey(orgSlug), String(next));
      return next;
    });
  };

  const handleDismiss = () => {
    dismissMutation({ organizationId });
  };

  // Loading or no progress yet
  if (progress === undefined) {
    return null;
  }

  // Dismissed or completed
  if (progress?.dismissedAt || progress?.completedAt) {
    return null;
  }

  // No progress record and no auto-detected steps
  if (progress === null) {
    return null;
  }

  const steps = getSteps(orgSlug);
  const completedCount = steps.filter((s) => progress.steps[s.key]).length;
  const percentage = Math.round((completedCount / steps.length) * 100);

  return (
    <div className="fixed right-4 bottom-4 z-[60] md:right-6 md:bottom-6">
      <AnimatePresence mode="wait">
        {isMinimized ? (
          <motion.button
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 rounded-full border bg-card px-4 py-2.5 shadow-lg transition-colors hover:bg-accent"
            exit={{ opacity: 0, scale: 0.9 }}
            initial={{ opacity: 0, scale: 0.9 }}
            key="pill"
            onClick={toggleMinimized}
            type="button"
          >
            <ListChecks className="text-primary" size={18} weight="bold" />
            <span className="font-medium text-sm">
              {completedCount}/{steps.length}
            </span>
            <div className="h-1.5 w-12 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </motion.button>
        ) : (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="w-[calc(100vw-2rem)] rounded-xl border bg-card shadow-xl md:w-[380px]"
            exit={{ opacity: 0, y: 20 }}
            initial={{ opacity: 0, y: 20 }}
            key="card"
          >
            <div className="flex items-start justify-between p-4 pb-2">
              <div>
                <h3 className="font-semibold text-sm">
                  Get started with Reflet
                </h3>
                <p className="text-muted-foreground text-xs">
                  Complete these steps to set up your workspace
                </p>
              </div>
              <Button
                className="shrink-0"
                onClick={toggleMinimized}
                size="icon"
                variant="ghost"
              >
                <CaretDown size={16} />
                <span className="sr-only">Minimize</span>
              </Button>
            </div>

            <div className="px-4">
              <div className="flex items-center gap-3">
                <Progress className="flex-1" value={percentage} />
                <span className="text-muted-foreground text-xs">
                  {completedCount}/{steps.length}
                </span>
              </div>
            </div>

            <ul className="max-h-[50vh] space-y-0.5 overflow-y-auto p-2">
              {steps.map((step) => {
                const done = progress.steps[step.key] ?? false;
                return (
                  <li key={step.key}>
                    <Link
                      className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted"
                      href={step.href}
                    >
                      {done ? (
                        <CheckCircle
                          className="shrink-0 text-primary"
                          size={18}
                          weight="fill"
                        />
                      ) : (
                        <Circle
                          className="shrink-0 text-muted-foreground"
                          size={18}
                        />
                      )}
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">
                          {step.icon}
                        </span>
                        <span
                          className={`text-sm ${
                            done ? "text-muted-foreground line-through" : ""
                          }`}
                        >
                          {step.label}
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>

            <div className="border-t px-4 py-2.5">
              <button
                className="text-muted-foreground text-xs transition-colors hover:text-foreground"
                onClick={handleDismiss}
                type="button"
              >
                Don't show again
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
