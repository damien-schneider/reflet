"use client";

import {
  ChatCircle,
  FileText,
  Heartbeat,
  Chat as MessageSquare,
} from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Doc } from "@reflet/backend/convex/_generated/dataModel";
import { env } from "@reflet/env/web";
import { useQuery } from "convex/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { H2, Text as TypographyText } from "@/components/ui/typography";
import { PublicViewToolbar } from "@/features/feedback/components/public-view-toolbar";
import { generateColorCssVars, generateColorPalette } from "@/lib/color-utils";

const DEFAULT_PRIMARY_COLOR = "#5c6d4f";

function resolveTab(pathname: string, basePath: string): string {
  const relativePath = basePath ? pathname.replace(basePath, "") : pathname;
  if (relativePath === "/changelog" || relativePath.startsWith("/changelog/")) {
    return "changelog";
  }
  if (relativePath === "/support" || relativePath.startsWith("/support/")) {
    return "support";
  }
  if (relativePath === "/status" || relativePath.startsWith("/status/")) {
    return "status";
  }
  return "feedback";
}

interface PublicOrgShellProps {
  basePath: string;
  children: React.ReactNode;
  org: Doc<"organizations">;
  orgSlug: string;
}

export function PublicOrgShell({
  basePath,
  children,
  org,
  orgSlug,
}: PublicOrgShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  const supportSettings = useQuery(
    api.support.conversations.getSupportSettings,
    { organizationId: org._id }
  );

  const supportEnabled = supportSettings?.supportEnabled ?? false;

  const statusAggregation = useQuery(api.status.monitors.getAggregateStatus, {
    organizationId: org._id,
  });
  const statusEnabled =
    statusAggregation !== undefined &&
    statusAggregation?.status !== "no_monitors";

  useEffect(() => {
    router.prefetch(`${basePath}/`);
    router.prefetch(`${basePath}/changelog`);
    if (supportEnabled) {
      router.prefetch(`${basePath}/support`);
    }
    if (statusEnabled) {
      router.prefetch(`${basePath}/status`);
    }
  }, [router, basePath, supportEnabled, statusEnabled]);

  const primaryColor = org.primaryColor ?? DEFAULT_PRIMARY_COLOR;
  const palette = generateColorPalette(primaryColor);
  const colorCssVars = generateColorCssVars(palette);

  const currentTab = resolveTab(pathname, basePath);

  const handleTabChange = (value: string | null) => {
    if (!value) {
      return;
    }
    if (value === "feedback") {
      router.push(basePath || "/");
    } else {
      router.push(`${basePath}/${value}`);
    }
  };

  return (
    <div className="min-h-screen" style={colorCssVars}>
      <header className="fixed z-40 mx-auto flex w-full items-center justify-between px-4 py-4">
        <div className="flex items-center gap-3">
          {org.logo ? (
            <Image
              alt={org.name}
              className="h-8 max-w-30 object-contain"
              height={32}
              src={org.logo}
              width={120}
            />
          ) : (
            <H2 variant="card">{org.name}</H2>
          )}
        </div>

        <Tabs
          className="hidden md:block"
          onValueChange={handleTabChange}
          value={currentTab}
        >
          <TabsList>
            <TabsTrigger value="feedback">
              <MessageSquare className="h-4 w-4" />
              Feedback
            </TabsTrigger>
            <TabsTrigger value="changelog">
              <FileText className="h-4 w-4" />
              Changelog
            </TabsTrigger>
            {statusEnabled && (
              <TabsTrigger value="status">
                <Heartbeat className="h-4 w-4" />
                Status
              </TabsTrigger>
            )}
            {supportEnabled && (
              <TabsTrigger value="support">
                <ChatCircle className="h-4 w-4" />
                Support
              </TabsTrigger>
            )}
          </TabsList>
        </Tabs>
      </header>

      <main className="min-h-[80vh] pt-22 pb-16 md:pb-0">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background md:hidden">
        <div className="flex items-center justify-around">
          <Link
            className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs transition-colors ${
              currentTab === "feedback"
                ? "font-medium text-olive-600"
                : "text-muted-foreground"
            }`}
            href={basePath || "/"}
          >
            <MessageSquare className="h-5 w-5" />
            Feedback
          </Link>
          <Link
            className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs transition-colors ${
              currentTab === "changelog"
                ? "font-medium text-olive-600"
                : "text-muted-foreground"
            }`}
            href={`${basePath}/changelog`}
          >
            <FileText className="h-5 w-5" />
            Changelog
          </Link>
          {statusEnabled && (
            <Link
              className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs transition-colors ${
                currentTab === "status"
                  ? "font-medium text-olive-600"
                  : "text-muted-foreground"
              }`}
              href={`${basePath}/status`}
            >
              <Heartbeat className="h-5 w-5" />
              Status
            </Link>
          )}
          {supportEnabled && (
            <Link
              className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs transition-colors ${
                currentTab === "support"
                  ? "font-medium text-olive-600"
                  : "text-muted-foreground"
              }`}
              href={`${basePath}/support`}
            >
              <ChatCircle className="h-5 w-5" />
              Support
            </Link>
          )}
        </div>
      </nav>

      {!(org.hideBranding && org.subscriptionTier === "pro") && (
        <footer className="py-8">
          <div className="container mx-auto flex items-center justify-center px-4 text-muted-foreground text-sm">
            <TypographyText variant="bodySmall">
              Powered by{" "}
              <Link
                className="font-display font-medium text-lg text-olive-600 underline underline-offset-4 transition-colors hover:text-olive-700 dark:text-olive-400 dark:hover:text-olive-300"
                href={env.NEXT_PUBLIC_SITE_URL ?? "https://www.reflet.app"}
                rel="noopener"
                target="_blank"
              >
                Reflet
              </Link>
            </TypographyText>
          </div>
        </footer>
      )}

      <PublicViewToolbar orgSlug={orgSlug} />
    </div>
  );
}
