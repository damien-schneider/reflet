import { api } from "@reflet-v2/backend/convex/_generated/api";
import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { FileText, Map as MapIcon, MessageSquare } from "lucide-react";
import type { CSSProperties } from "react";

export const Route = createFileRoute("/$orgSlug")({
  component: PublicOrgLayout,
});

function PublicOrgLayout() {
  const { orgSlug } = Route.useParams();
  const org = useQuery(api.organizations.getBySlug, { slug: orgSlug });

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
          The organization you're looking for doesn't exist.
        </p>
        <Link className="mt-4 text-primary hover:underline" to="/">
          Go back home
        </Link>
      </div>
    );
  }

  // Branding fields are directly on the org, not nested
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
              <img
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
              activeOptions={{ exact: true }}
              activeProps={{ className: "text-primary" }}
              className="flex items-center gap-2 font-medium text-sm hover:text-primary"
              params={{ orgSlug }}
              to="/$orgSlug"
            >
              <MessageSquare className="h-4 w-4" />
              Feedback
            </Link>
            <Link
              activeProps={{ className: "text-primary" }}
              className="flex items-center gap-2 font-medium text-sm hover:text-primary"
              params={{ orgSlug }}
              to="/$orgSlug/roadmap"
            >
              <MapIcon className="h-4 w-4" />
              Roadmap
            </Link>
            <Link
              activeProps={{ className: "text-primary" }}
              className="flex items-center gap-2 font-medium text-sm hover:text-primary"
              params={{ orgSlug }}
              to="/$orgSlug/changelog"
            >
              <FileText className="h-4 w-4" />
              Changelog
            </Link>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main>
        <Outlet />
      </main>

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
    </div>
  );
}
