import { api } from "@reflet-v2/backend/convex/_generated/api";
import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { CreditCard, Palette, Settings, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/$orgSlug/settings")({
  component: SettingsLayout,
});

const settingsNavItems = [
  {
    title: "General",
    href: "",
    icon: Settings,
  },
  {
    title: "Members",
    href: "/members",
    icon: Users,
  },
  {
    title: "Branding",
    href: "/branding",
    icon: Palette,
  },
  {
    title: "Billing",
    href: "/billing",
    icon: CreditCard,
  },
];

const settingsRouteMap: Record<string, string> = {
  "": "/dashboard/$orgSlug/settings",
  "/members": "/dashboard/$orgSlug/settings/members",
  "/branding": "/dashboard/$orgSlug/settings/branding",
  "/billing": "/dashboard/$orgSlug/settings/billing",
};

function SettingsLayout() {
  const { orgSlug } = Route.useParams();
  const org = useQuery(api.organizations.getBySlug, { slug: orgSlug });

  if (!org) {
    return (
      <div className="flex h-full items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  const isAdmin = org.role === "owner" || org.role === "admin";

  if (!isAdmin) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h2 className="font-semibold text-lg">Access Denied</h2>
          <p className="text-muted-foreground">
            You need to be an admin to access settings.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="font-bold text-2xl">Settings</h1>
        <p className="text-muted-foreground">
          Manage your organization settings.
        </p>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Sidebar navigation */}
        <nav className="flex gap-2 lg:w-48 lg:flex-col">
          {settingsNavItems.map((item) => (
            <Link
              activeOptions={{ exact: item.href === "" }}
              activeProps={{
                className: "bg-accent",
              }}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 font-medium text-sm transition-colors hover:bg-accent"
              )}
              key={item.href}
              params={{ orgSlug }}
              to={settingsRouteMap[item.href] ?? "/dashboard/$orgSlug/settings"}
            >
              <item.icon className="h-4 w-4" />
              {item.title}
            </Link>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
