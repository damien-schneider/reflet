"use client";

import { Tabs, TabsList, TabsTab } from "@ctrl-ui/react/ui/tabs";
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
import { H2, Text as TypographyText } from "@/components/ui/typography";
import { PublicViewToolbar } from "@/features/feedback/components/public-view-toolbar";
import { DEFAULT_PRIMARY_COLOR } from "@/lib/branding";
import { generateColorCssVars, generateColorPalette } from "@/lib/color-utils";
import { cn } from "@/lib/utils";

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

function MobileNavLink({
  href,
  icon: Icon,
  isActive,
  label,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive: boolean;
  label: string;
}) {
  return (
    <Link
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex flex-1 flex-col items-center gap-1 py-3 text-xs transition-colors",
        isActive ? "font-medium text-brand-text" : "text-muted-foreground"
      )}
      href={href}
    >
      <Icon className="h-5 w-5" />
      {label}
    </Link>
  );
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

  const supportSettings = useQuery(api.support.settings.get, {
    organizationId: org._id,
  });

  const publicPlanFeatures = useQuery(
    api.billing.queries.getPublicPlanFeatures,
    {
      organizationId: org._id,
    }
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
              className="h-8 max-w-30 object-contain outline outline-1 outline-black/10 -outline-offset-1 dark:outline-white/10"
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
            <TabsTab value="feedback">
              <MessageSquare className="h-4 w-4" />
              Feedback
            </TabsTab>
            <TabsTab value="changelog">
              <FileText className="h-4 w-4" />
              Changelog
            </TabsTab>
            {statusEnabled && (
              <TabsTab value="status">
                <Heartbeat className="h-4 w-4" />
                Status
              </TabsTab>
            )}
            {supportEnabled && (
              <TabsTab value="support">
                <ChatCircle className="h-4 w-4" />
                Support
              </TabsTab>
            )}
          </TabsList>
        </Tabs>
      </header>

      <main className="min-h-[80vh] pt-22 pb-16 md:pb-0">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background md:hidden">
        <div className="flex items-center justify-around">
          <MobileNavLink
            href={basePath || "/"}
            icon={MessageSquare}
            isActive={currentTab === "feedback"}
            label="Feedback"
          />
          <MobileNavLink
            href={`${basePath}/changelog`}
            icon={FileText}
            isActive={currentTab === "changelog"}
            label="Changelog"
          />
          {statusEnabled && (
            <MobileNavLink
              href={`${basePath}/status`}
              icon={Heartbeat}
              isActive={currentTab === "status"}
              label="Status"
            />
          )}
          {supportEnabled && (
            <MobileNavLink
              href={`${basePath}/support`}
              icon={ChatCircle}
              isActive={currentTab === "support"}
              label="Support"
            />
          )}
        </div>
      </nav>

      {!publicPlanFeatures?.hideBranding && (
        <footer className="py-8">
          <div className="container mx-auto flex items-center justify-center px-4 text-muted-foreground text-sm">
            <TypographyText variant="bodySmall">
              Powered by{" "}
              <Link
                className="font-display font-medium text-brand-text text-lg underline underline-offset-4 transition-colors hover:text-brand-text/80"
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
