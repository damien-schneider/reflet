"use client";

import {
  ChatCircle,
  FileText,
  MapTrifold as MapIcon,
  Chat as MessageSquare,
} from "@phosphor-icons/react";
import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { use } from "react";
import {
  H1,
  H2,
  Muted,
  Text as TypographyText,
} from "@/components/ui/typography";
import { PublicViewToolbar } from "@/features/feedback/components/public-view-toolbar";

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

  const supportSettings = useQuery(
    api.support_conversations.getSupportSettings,
    org?._id ? { organizationId: org._id as Id<"organizations"> } : "skip"
  );

  const supportEnabled = supportSettings?.supportEnabled ?? false;

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
    <div className="min-h-screen">
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
        <nav className="hidden items-center gap-4 md:flex">
          <Link
            className={`flex items-center gap-2 font-medium text-sm hover:text-olive-600 ${
              pathname === `/${orgSlug}` ? "text-olive-600" : ""
            }`}
            href={`/${orgSlug}`}
          >
            <MessageSquare className="h-4 w-4" />
            Feedback
          </Link>
          <Link
            className={`flex items-center gap-2 font-medium text-sm hover:text-olive-600 ${
              pathname === `/${orgSlug}/roadmap` ? "text-olive-600" : ""
            }`}
            href={`/${orgSlug}/roadmap`}
          >
            <MapIcon className="h-4 w-4" />
            Roadmap
          </Link>
          <Link
            className={`flex items-center gap-2 font-medium text-sm hover:text-olive-600 ${
              pathname === `/${orgSlug}/changelog` ? "text-olive-600" : ""
            }`}
            href={`/${orgSlug}/changelog`}
          >
            <FileText className="h-4 w-4" />
            Changelog
          </Link>
          {supportEnabled && (
            <Link
              className={`flex items-center gap-2 font-medium text-sm hover:text-olive-600 ${
                pathname === `/${orgSlug}/support` ? "text-olive-600" : ""
              }`}
              href={`/${orgSlug}/support`}
            >
              <ChatCircle className="h-4 w-4" />
              Support
            </Link>
          )}
        </nav>
      </header>

      <nav className="fixed inset-x-4 bottom-4 z-50 flex items-center justify-around rounded-full border border-border bg-background/95 px-2 py-3 shadow-lg backdrop-blur-md md:hidden">
        <Link
          className={`flex flex-col items-center gap-1 rounded-full px-4 py-1 font-medium text-xs transition-colors ${
            pathname === `/${orgSlug}`
              ? "bg-olive-100 text-olive-600 dark:bg-olive-900/30"
              : "text-muted-foreground hover:text-foreground"
          }`}
          href={`/${orgSlug}`}
        >
          <MessageSquare className="h-5 w-5" />
          Feedback
        </Link>
        <Link
          className={`flex flex-col items-center gap-1 rounded-full px-4 py-1 font-medium text-xs transition-colors ${
            pathname === `/${orgSlug}/roadmap`
              ? "bg-olive-100 text-olive-600 dark:bg-olive-900/30"
              : "text-muted-foreground hover:text-foreground"
          }`}
          href={`/${orgSlug}/roadmap`}
        >
          <MapIcon className="h-5 w-5" />
          Roadmap
        </Link>
        <Link
          className={`flex flex-col items-center gap-1 rounded-full px-4 py-1 font-medium text-xs transition-colors ${
            pathname === `/${orgSlug}/changelog`
              ? "bg-olive-100 text-olive-600 dark:bg-olive-900/30"
              : "text-muted-foreground hover:text-foreground"
          }`}
          href={`/${orgSlug}/changelog`}
        >
          <FileText className="h-5 w-5" />
          Changelog
        </Link>
        {supportEnabled && (
          <Link
            className={`flex flex-col items-center gap-1 rounded-full px-4 py-1 font-medium text-xs transition-colors ${
              pathname === `/${orgSlug}/support`
                ? "bg-olive-100 text-olive-600 dark:bg-olive-900/30"
                : "text-muted-foreground hover:text-foreground"
            }`}
            href={`/${orgSlug}/support`}
          >
            <ChatCircle className="h-5 w-5" />
            Support
          </Link>
        )}
      </nav>

      <main className="min-h-[80vh] pt-22 pb-24 md:pb-0">{children}</main>

      <footer className="py-8">
        <div className="container mx-auto flex items-center justify-center px-4 text-muted-foreground text-sm">
          <TypographyText variant="bodySmall">
            Powered by{" "}
            <Link
              className="font-display font-medium text-lg text-olive-600 underline underline-offset-4 transition-colors hover:text-olive-700 dark:text-olive-400 dark:hover:text-olive-300"
              href="https://reflet.app"
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
