"use client";

import {
  ChatCircle,
  FileText,
  Chat as MessageSquare,
} from "@phosphor-icons/react";
import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { use, useEffect, useMemo } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  H1,
  H2,
  Muted,
  Text as TypographyText,
} from "@/components/ui/typography";
import { PublicViewToolbar } from "@/features/feedback/components/public-view-toolbar";
import { generateColorCssVars, generateColorPalette } from "@/lib/color-utils";

const DEFAULT_PRIMARY_COLOR = "#5c6d4f";

export default function PublicOrgLayoutClient({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  const org = useQuery(api.organizations.getBySlug, { slug: orgSlug });
  const pathname = usePathname();
  const router = useRouter();

  const supportSettings = useQuery(
    api.support_conversations.getSupportSettings,
    org?._id ? { organizationId: org._id as Id<"organizations"> } : "skip"
  );

  const supportEnabled = supportSettings?.supportEnabled ?? false;

  // Prefetch tab routes for instant navigation
  useEffect(() => {
    router.prefetch(`/${orgSlug}`);
    router.prefetch(`/${orgSlug}/changelog`);
    if (supportEnabled) {
      router.prefetch(`/${orgSlug}/support`);
    }
  }, [router, orgSlug, supportEnabled]);

  const colorCssVars = useMemo(() => {
    const primaryColor = org?.primaryColor ?? DEFAULT_PRIMARY_COLOR;
    const palette = generateColorPalette(primaryColor);
    return generateColorCssVars(palette);
  }, [org?.primaryColor]);

  const currentTab = useMemo(() => {
    if (pathname === `/${orgSlug}/changelog`) {
      return "changelog";
    }
    if (pathname === `/${orgSlug}/support`) {
      return "support";
    }
    return "feedback";
  }, [pathname, orgSlug]);

  const handleTabChange = (value: string | null) => {
    if (!value) {
      return;
    }
    if (value === "feedback") {
      router.push(`/${orgSlug}`);
    } else {
      router.push(`/${orgSlug}/${value}`);
    }
  };

  if (org === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  if (org === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <H1 variant="page">Organization not found</H1>
        <Muted className="text-center">
          The organization you&apos;re looking for doesn&apos;t exist.
        </Muted>
        <Link
          className="mt-4 text-olive-600 underline underline-offset-4 transition-colors hover:text-olive-700 dark:text-olive-400 dark:hover:text-olive-300"
          href="/"
        >
          Go back home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={colorCssVars as React.CSSProperties}>
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

        {/* Desktop (sm:): Tabs */}
        <Tabs
          className="hidden sm:block"
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
            {supportEnabled && (
              <TabsTrigger value="support">
                <ChatCircle className="h-4 w-4" />
                Support
              </TabsTrigger>
            )}
          </TabsList>
        </Tabs>
      </header>

      <main className="min-h-[80vh] pt-22 pb-16 sm:pb-0">{children}</main>

      {/* Mobile: Bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background sm:hidden">
        <div className="flex items-center justify-around">
          <Link
            className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs transition-colors ${
              currentTab === "feedback"
                ? "font-medium text-olive-600"
                : "text-muted-foreground"
            }`}
            href={`/${orgSlug}`}
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
            href={`/${orgSlug}/changelog`}
          >
            <FileText className="h-5 w-5" />
            Changelog
          </Link>
          {supportEnabled && (
            <Link
              className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs transition-colors ${
                currentTab === "support"
                  ? "font-medium text-olive-600"
                  : "text-muted-foreground"
              }`}
              href={`/${orgSlug}/support`}
            >
              <ChatCircle className="h-5 w-5" />
              Support
            </Link>
          )}
        </div>
      </nav>

      <footer className="py-8">
        <div className="container mx-auto flex items-center justify-center px-4 text-muted-foreground text-sm">
          <TypographyText variant="bodySmall">
            Powered by{" "}
            <Link
              className="font-display font-medium text-lg text-olive-600 underline underline-offset-4 transition-colors hover:text-olive-700 dark:text-olive-400 dark:hover:text-olive-300"
              href={process.env.NEXT_PUBLIC_SITE_URL ?? "https://reflet.app"}
              rel="noopener"
              target="_blank"
            >
              Reflet
            </Link>
          </TypographyText>
        </div>
      </footer>

      <PublicViewToolbar orgSlug={orgSlug} />
    </div>
  );
}
