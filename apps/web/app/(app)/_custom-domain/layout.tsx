"use client";

import { Spinner } from "@ctrl-ui/react/ui/spinner";
import { api } from "@reflet/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { H1, Muted } from "@/components/ui/typography";
import { PublicOrgShell } from "@/features/public-org/components/public-org-shell";

export default function CustomDomainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [hostname, setHostname] = useState<string | null>(null);

  useEffect(() => {
    setHostname(window.location.hostname);
  }, []);

  const org = useQuery(
    api.domains.queries.getByCustomDomain,
    hostname ? { domain: hostname } : "skip"
  );

  if (!hostname || org === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (org === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <H1 variant="page">Site not found</H1>
        <Muted className="text-center">
          No organization is configured for this domain.
        </Muted>
        <Link
          className="mt-4 text-brand-text underline underline-offset-4 transition-colors hover:text-foreground"
          href="https://www.reflet.app"
          rel="noopener"
        >
          Go to Reflet
        </Link>
      </div>
    );
  }

  return (
    <PublicOrgShell basePath="" org={org} orgSlug={org.slug}>
      {children}
    </PublicOrgShell>
  );
}
