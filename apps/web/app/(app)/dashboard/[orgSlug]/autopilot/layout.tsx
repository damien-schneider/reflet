"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { useAtomValue } from "jotai";

import { use, useCallback, useEffect, useRef, useState } from "react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { H1, H2, Muted } from "@/components/ui/typography";
import { LiveTicker } from "@/features/autopilot/components/activity/live-ticker";
import { AutonomyToggle } from "@/features/autopilot/components/autonomy-toggle";
import { AutopilotContext } from "@/features/autopilot/components/autopilot-context";
import { AutopilotNav } from "@/features/autopilot/components/autopilot-nav";
import { CeoChatPanel } from "@/features/autopilot/components/ceo-chat/ceo-chat-panel";
import { CeoChatToggle } from "@/features/autopilot/components/ceo-chat/ceo-chat-toggle";
import { HealthBanner } from "@/features/autopilot/components/health-banner";
import { ceoChatOpenAtom } from "@/store/ui";

export default function AutopilotLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  const isChatOpen = useAtomValue(ceoChatOpenAtom);

  const panelRef = useRef<HTMLElement>(null);
  const isResizing = useRef(false);
  const [panelWidth, setPanelWidth] = useState<number | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) {
        return;
      }
      const minWidth =
        Number.parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue(
            "--ceo-chat-min-width"
          )
        ) * 16;
      const maxWidth =
        Number.parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue(
            "--ceo-chat-max-width"
          )
        ) * 16;
      const newWidth = Math.min(
        Math.max(window.innerWidth - e.clientX, minWidth),
        maxWidth
      );
      setPanelWidth(newWidth);
    };

    const handleMouseUp = () => {
      if (!isResizing.current) {
        return;
      }
      isResizing.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const org = useQuery(api.organizations.queries.getBySlug, {
    slug: orgSlug,
  });

  const currentMember = useQuery(
    api.organizations.members.getCurrentMember,
    org ? { organizationId: org._id } : "skip"
  );

  const config = useQuery(
    api.autopilot.queries.config.getConfig,
    org?._id ? { organizationId: org._id } : "skip"
  );

  if (org === undefined) {
    return (
      <div className="mx-auto max-w-6xl px-4 pt-12 pb-8">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <H2 variant="card">Organization not found</H2>
          <Muted className="mt-2">
            The organization you&apos;re looking for doesn&apos;t exist.
          </Muted>
        </div>
      </div>
    );
  }

  if (currentMember === undefined) {
    return (
      <div className="mx-auto max-w-6xl px-4 pt-12 pb-8">
        <div className="flex flex-col md:flex-row md:gap-8">
          <div className="hidden w-56 shrink-0 md:block">
            <div className="space-y-2">
              {Array.from({ length: 7 }, (_, i) => (
                <Skeleton
                  className="h-10 w-full rounded-lg"
                  key={`skeleton-${String(i)}`}
                />
              ))}
            </div>
          </div>
          <div className="min-w-0 flex-1 space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  const isAdmin =
    currentMember?.role === "admin" || currentMember?.role === "owner";
  const baseUrl = `/dashboard/${orgSlug}/autopilot`;

  const chatWidthStyle = panelWidth ? `${String(panelWidth)}px` : undefined;

  return (
    <AutopilotContext value={{ organizationId: org._id, isAdmin, orgSlug }}>
      <div
        className="transition-[padding] duration-300 ease-in-out"
        style={{
          paddingRight: isChatOpen
            ? `calc(${chatWidthStyle ?? "var(--ceo-chat-width)"} + 1.5rem)`
            : undefined,
        }}
      >
        <div className="mx-auto max-w-6xl px-4 pt-12 pb-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <H1 variant="page">Autopilot</H1>
              <Muted>AI-powered product team for your codebase</Muted>
            </div>
            <div className="flex items-center gap-3">
              <AutonomyToggle />
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:gap-8">
            <ScrollArea className="-mx-4 mb-6 md:hidden" direction="horizontal">
              <div className="px-4">
                <AutopilotNav baseUrl={baseUrl} variant="tabs" />
              </div>
            </ScrollArea>

            <div className="sticky top-12 hidden w-56 shrink-0 self-start md:block">
              <AutopilotNav baseUrl={baseUrl} variant="sidebar" />
            </div>

            <div className="min-w-0 flex-1">
              <HealthBanner />
              {config?.autonomyMode && config.autonomyMode !== "stopped" ? (
                <LiveTicker organizationId={org._id} />
              ) : null}
              {children}
            </div>
          </div>
        </div>
      </div>

      <CeoChatToggle />

      {isChatOpen && (
        <aside
          className="fixed top-3 right-3 bottom-3 z-40 overflow-hidden rounded-xl border border-border bg-background shadow-lg"
          ref={panelRef}
          style={{
            width: chatWidthStyle ?? "var(--ceo-chat-width)",
            minWidth: "var(--ceo-chat-min-width)",
            maxWidth: "var(--ceo-chat-max-width)",
          }}
        >
          <button
            aria-label="Resize chat panel"
            className="absolute inset-y-0 left-0 z-50 w-1.5 cursor-col-resize border-none bg-transparent p-0 transition-colors hover:bg-primary/10"
            onMouseDown={handleMouseDown}
            type="button"
          />
          <CeoChatPanel organizationId={org._id} />
        </aside>
      )}
    </AutopilotContext>
  );
}
