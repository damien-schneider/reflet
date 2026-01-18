"use client";

import { api } from "@reflet-v2/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useAtom } from "jotai";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { OrganizationSwitcher } from "@/components/organization-switcher";
import { Button } from "@/components/ui/button";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/features/dashboard/components/dashboard-sidebar";
import { sidebarOpenAtom } from "@/store/dashboard-atoms";

export function DashboardContent({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const orgSlug = params?.orgSlug as string | undefined;
  const router = useRouter();
  const pathname = usePathname();
  const organizations = useQuery(api.organizations.list);
  const currentUser = useQuery(api.auth.getCurrentUser);
  const ensurePersonalOrganization = useMutation(
    api.organizations_personal.ensurePersonalOrganization
  );
  const [ensureAttempted, setEnsureAttempted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useAtom(sidebarOpenAtom);

  const hasOrganizations = !!organizations && organizations.length > 0;

  useEffect(() => {
    if (organizations && organizations.length === 0 && !ensureAttempted) {
      setEnsureAttempted(true);
      ensurePersonalOrganization({
        name: currentUser?.name ?? undefined,
      }).catch(() => {
        // Silent fail - user can create manually
      });
    }
  }, [
    organizations,
    ensureAttempted,
    ensurePersonalOrganization,
    currentUser?.name,
  ]);

  useEffect(() => {
    if (!orgSlug && organizations && organizations.length === 1) {
      const org = organizations[0];
      if (org) {
        router.replace(`/dashboard/${org.slug}`);
      }
    }
  }, [router, orgSlug, organizations]);

  return (
    <SidebarProvider onOpenChange={setSidebarOpen} open={sidebarOpen}>
      <DashboardSidebar orgSlug={orgSlug} pathname={pathname ?? ""} />
      <SidebarInset className="flex max-h-svh flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <div className="flex flex-1 items-center gap-2">
            <span className="font-medium text-sm">Dashboard</span>
          </div>
        </header>

        <div className="flex-1 overflow-auto">
          {!orgSlug && hasOrganizations ? (
            <main className="flex h-full items-center justify-center p-6">
              <div className="max-w-md text-center">
                <h2 className="font-bold text-2xl">Select an organization</h2>
                <p className="mt-2 text-muted-foreground">
                  Choose an organization from the sidebar or select one below.
                </p>
                <div className="mt-8 flex flex-col gap-3">
                  {organizations.map((org) =>
                    org ? (
                      <Link href={`/dashboard/${org.slug}`} key={org._id}>
                        <Button
                          className="w-full justify-between rounded-lg px-4"
                          variant="outline"
                        >
                          {org.name}
                          <ChevronRight className="h-4 w-4 opacity-50" />
                        </Button>
                      </Link>
                    ) : null
                  )}
                </div>
              </div>
            </main>
          ) : null}

          {!orgSlug && organizations && organizations.length === 0 ? (
            <main className="flex h-full items-center justify-center p-6">
              <div className="max-w-md text-center">
                <h2 className="font-bold text-2xl">Welcome to Reflet!</h2>
                <p className="mt-2 text-muted-foreground">
                  Create your first organization to start collecting feedback.
                </p>
                <div className="mt-8">
                  <OrganizationSwitcher />
                </div>
              </div>
            </main>
          ) : null}

          {orgSlug ? children : null}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
