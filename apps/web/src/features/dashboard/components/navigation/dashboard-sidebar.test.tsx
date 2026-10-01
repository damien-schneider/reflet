import { SidebarProvider } from "@ctrl-ui/react/ui/sidebar";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getFunctionName } from "convex/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardSidebar } from "@/features/dashboard/components/dashboard-sidebar";

const session = vi.hoisted(() => ({ role: "owner", tier: "free" }));

vi.mock("convex/react", () => ({
  useQuery: (query: Parameters<typeof getFunctionName>[0]) => {
    switch (getFunctionName(query)) {
      case "auth/queries:getCurrentUser":
        return {
          email: "jane@example.com",
          image: "/jane.png",
          name: "Jane Doe",
        };
      case "organizations/queries:list":
        return [
          {
            _id: "org1",
            isPublic: true,
            role: session.role,
            slug: "acme",
            subscriptionTier: session.tier,
          },
        ];
      case "organizations/super_admin:isSuperAdmin":
        return false;
      default:
        return 0;
    }
  },
}));
vi.mock(
  "@/features/command-palette/components/command-palette-trigger",
  () => ({ CommandPaletteTrigger: () => null })
);
vi.mock("@/features/organizations/components/organization-switcher", () => ({
  OrganizationSwitcher: () => <span>Acme</span>,
}));
vi.mock("@/features/dashboard/components/sidebar-footer-content", () => ({
  SidebarFooterContent: () => null,
}));
vi.mock("@/features/dashboard/components/make-public-banner", () => ({
  MakePublicBanner: () => null,
}));
vi.mock("@/lib/auth-client", () => ({ authClient: { signOut: vi.fn() } }));
vi.mock("@/lib/analytics", () => ({ capture: vi.fn() }));
vi.mock("posthog-js", () => ({ default: { reset: vi.fn() } }));
vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard/acme" }));
vi.mock("@ctrl-ui/react/ui/avatar", () => ({
  Avatar: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
  AvatarFallback: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
  AvatarImage: ({ src }: { src?: string }) => <img alt="" src={src} />,
}));

Element.prototype.getAnimations = () => [];

beforeEach(() => {
  session.role = "owner";
  session.tier = "free";
  vi.stubGlobal(
    "matchMedia",
    vi.fn((media: string) => ({
      addEventListener: vi.fn(),
      matches: false,
      media,
      removeEventListener: vi.fn(),
    }))
  );
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    }
  );
});
afterEach(() => vi.unstubAllGlobals());

function renderSidebar(pathname = "/dashboard/acme", defaultOpen = true) {
  return render(
    <SidebarProvider defaultOpen={defaultOpen} persistOpen={false}>
      <DashboardSidebar orgSlug="acme" pathname={pathname} />
    </SidebarProvider>
  );
}

describe("Dashboard navigation", () => {
  it("keeps settings visible without opening a Project disclosure", () => {
    renderSidebar("/dashboard/acme/project/members/invitations");
    expect(screen.queryByRole("button", { name: "Project" })).toBeNull();
    const members = screen.getByRole("link", { name: "Members" });
    expect(members).toHaveAttribute("href", "/dashboard/acme/project/members");
    expect(members).toHaveAttribute("aria-current", "page");
    expect(
      screen.getByRole("link", { exact: true, name: "Feedback" })
    ).not.toHaveAttribute("aria-current");
    expect(
      within(screen.getByRole("list", { name: "Developer tools" })).getByRole(
        "link",
        { name: "GitHub" }
      )
    ).toBeVisible();
    expect(
      within(screen.getByRole("list", { name: "Organization" })).getByRole(
        "link",
        { name: "Billing" }
      )
    ).toBeVisible();
  });

  it("shows the member photo and account menu in the footer", async () => {
    const { container } = renderSidebar();
    const footer = container.querySelector('[data-slot="footer"]');
    const account = screen.getByRole("button", { name: /Jane Doe/ });
    expect(footer).toContainElement(account);
    expect(within(account).getByRole("presentation")).toHaveAttribute(
      "src",
      "/jane.png"
    );
    await userEvent.click(account);
    expect(
      await screen.findByRole("menuitem", { name: "Account settings" })
    ).toBeVisible();
  });

  it("keeps billing reachable when collapsed and exposes the shared resize rail", () => {
    renderSidebar("/dashboard/acme", false);
    expect(
      screen.getByRole("link", { name: "Upgrade to Pro" })
    ).toHaveAttribute("href", "/dashboard/acme/project/billing");
    expect(
      screen.getByRole("separator", { name: "Resize sidebar" })
    ).toHaveAttribute("aria-valuetext", "collapsed");
  });

  it("does not offer admin actions to members", () => {
    session.role = "member";
    renderSidebar();
    expect(screen.queryByRole("link", { name: "Inbox" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Trash" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Upgrade to Pro" })).toBeNull();
    expect(screen.getByRole("link", { name: "Members" })).toBeVisible();
  });
  it("keeps billing available without offering an upgrade to a paid owner", () => {
    session.tier = "pro";
    renderSidebar();
    expect(screen.queryByRole("link", { name: "Upgrade to Pro" })).toBeNull();
    expect(screen.getByRole("link", { name: "Billing" })).toBeVisible();
  });

  it("keeps Feedback active on a feedback detail route", () => {
    renderSidebar("/dashboard/acme/feedback/feedback1");
    expect(
      screen.getByRole("link", { exact: true, name: "Feedback" })
    ).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Changelog" })).not.toHaveAttribute(
      "aria-current"
    );
  });
});
