"use client";

import {
  FileText,
  MapTrifold as MapIcon,
  Chat as MessageSquare,
} from "@phosphor-icons/react";
import { api } from "@reflet-v2/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CSSProperties } from "react";
import { use } from "react";

import { PublicViewToolbar } from "@/components/public-view-toolbar";

export default function PublicOrgLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  const org = useQuery(api.organizations.getBySlug, { slug: orgSlug });
  const pathname = usePathname();

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
        <h1 className="font-bold text-2xl">Organization not found</h1>
        <p className="text-muted-foreground">
          The organization you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link className="mt-4 text-primary hover:underline" href="/">
          Go back home
        </Link>
      </div>
    );
  }

  const primaryColor = org.primaryColor ?? "#3b82f6";

  return (
    <div
      className="min-h-screen"
      style={
        {
          "--primary": primaryColor,
        } as CSSProperties
      }
    >
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            {org.logo ? (
              <Image
                alt={org.name}
                className="h-8 max-w-[120px] object-contain"
                height={32}
                src={org.logo}
                width={120}
              />
            ) : (
              <span className="font-bold text-xl">{org.name}</span>
            )}
          </div>
          <nav className="flex items-center gap-4">
            <Link
              className={`flex items-center gap-2 font-medium text-sm hover:text-primary ${
                pathname === `/${orgSlug}` ? "text-primary" : ""
              }`}
              href={`/${orgSlug}`}
            >
              <MessageSquare className="h-4 w-4" />
              Feedback
            </Link>
            <Link
              className={`flex items-center gap-2 font-medium text-sm hover:text-primary ${
                pathname === `/${orgSlug}/roadmap` ? "text-primary" : ""
              }`}
              href={`/${orgSlug}/roadmap`}
            >
              <MapIcon className="h-4 w-4" />
              Roadmap
            </Link>
            <Link
              className={`flex items-center gap-2 font-medium text-sm hover:text-primary ${
                pathname === `/${orgSlug}/changelog` ? "text-primary" : ""
              }`}
              href={`/${orgSlug}/changelog`}
            >
              <FileText className="h-4 w-4" />
              Changelog
            </Link>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main>{children}</main>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground text-sm">
          <p>
            Powered by{" "}
            <a
              className="font-medium hover:text-primary"
              href="https://reflet.app"
              rel="noopener"
              target="_blank"
            >
              Reflet
            </a>
          </p>
        </div>
      </footer>

      {/* Floating toolbar for team members */}
      <PublicViewToolbar orgSlug={orgSlug} />
    </div>
  );
}
