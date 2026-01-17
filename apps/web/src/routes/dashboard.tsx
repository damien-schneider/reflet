import { api } from "@reflet-v2/backend/convex/_generated/api";
import {
  createFileRoute,
  Link,
  Outlet,
  useNavigate,
  useParams,
} from "@tanstack/react-router";
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useMutation,
  useQuery,
} from "convex/react";
import { useAtom } from "jotai";
import { ChevronRight, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { OrganizationSwitcher } from "@/components/organization-switcher";
import SignInForm from "@/components/sign-in-form";
import SignUpForm from "@/components/sign-up-form";
import { Button } from "@/components/ui/button";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/features/dashboard/components/dashboard-sidebar";
import { sidebarOpenAtom } from "@/store/dashboard-atoms";

export const Route = createFileRoute("/dashboard")({
  component: DashboardLayout,
});

function DashboardContent() {
  const params = useParams({ strict: false });
  const orgSlug = (params as { orgSlug?: string }).orgSlug;
  const navigate = useNavigate();
  const organizations = useQuery(api.organizations.list);
  const currentUser = useQuery(api.auth.getCurrentUser);
  const ensurePersonalOrganization = useMutation(
    api.organizations_personal.ensurePersonalOrganization
  );
  const [ensureAttempted, setEnsureAttempted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useAtom(sidebarOpenAtom);

  const pathname =
    typeof window !== "undefined" ? window.location.pathname : "";
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
        navigate({
          to: "/dashboard/$orgSlug",
          params: { orgSlug: org.slug },
          replace: true,
        });
      }
    }
  }, [navigate, orgSlug, organizations]);

  return (
    <SidebarProvider onOpenChange={setSidebarOpen} open={sidebarOpen}>
      <DashboardSidebar orgSlug={orgSlug} pathname={pathname} />
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
                      <Link
                        key={org._id}
                        params={{ orgSlug: org.slug }}
                        to="/dashboard/$orgSlug"
                      >
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

          {orgSlug ? <Outlet /> : null}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function DashboardLayout() {
  const [showSignIn, setShowSignIn] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <div className="h-svh bg-background">
      <Authenticated>
        {isClient ? (
          <DashboardContent />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}
      </Authenticated>
      <Unauthenticated>
        <div className="flex h-full items-center justify-center">
          {showSignIn ? (
            <SignInForm onSwitchToSignUp={() => setShowSignIn(false)} />
          ) : (
            <SignUpForm onSwitchToSignIn={() => setShowSignIn(true)} />
          )}
        </div>
      </Unauthenticated>
      <AuthLoading>
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AuthLoading>
    </div>
  );
}
