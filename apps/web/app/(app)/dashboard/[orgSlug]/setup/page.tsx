"use client";

import { Spinner } from "@ctrl-ui/react/ui/spinner";
import { api } from "@reflet/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { use } from "react";
import { OrgNotFound } from "@/features/dashboard/components/org-not-found";
import { SetupPage } from "@/features/project-setup/components/setup-page";
import { authClient } from "@/lib/auth-client";

export default function SetupRoute({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  const { data: session } = authClient.useSession();
  const org = useQuery(api.organizations.queries.getBySlug, { slug: orgSlug });

  if (org === undefined) {
    return (
      <div className="flex min-h-[calc(100svh-3.5rem)] items-center justify-center p-6">
        <Spinner size="lg" />
      </div>
    );
  }

  if (org === null) {
    return <OrgNotFound />;
  }

  return (
    <SetupPage
      organizationId={org._id}
      orgSlug={orgSlug}
      userId={session?.user?.id}
    />
  );
}
