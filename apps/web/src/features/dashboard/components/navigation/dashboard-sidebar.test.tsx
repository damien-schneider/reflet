import { SidebarProvider } from "@ctrl-ui/react/ui/sidebar";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getFunctionName } from "convex/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardSidebar } from "@/features/dashboard/components/dashboard-sidebar";
import { OrgNavigationMenu } from "@/features/dashboard/components/navigation/org-navigation";
import { orgSections } from "@/features/dashboard/components/navigation/org-sections";

const session = vi.hoisted(() => ({ role: "owner", tier: "free" }));
const viewport = vi.hoisted(() => ({ mobile: false }));

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
vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/acme",
  useSearchParams: () => new URLSearchParams(),
}));
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
  viewport.mobile = false;
  vi.stubGlobal(
    "matchMedia",
    vi.fn((media: string) => ({
      addEventListener: vi.fn(),
      matches: viewport.mobile,
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

function renderSidebar(pathname = "/dashboard/acme") {
  return render(
    <SidebarProvider open={false} persistOpen={false}>
      <DashboardSidebar orgSlug="acme" pathname={pathname} />
    </SidebarProvider>
  );
}

describe("Dashboard navigation", () => {
  it("keeps one rail entry per section and marks the one holding the page", () => {
    renderSidebar("/dashboard/acme/project/members/invitations");
    const settings = screen.getByRole("link", { name: "Settings" });
    expect(settings).toHaveAttribute("href", "/dashboard/acme/project/general");
    expect(settings).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Developer" })).toHaveAttribute(
      "href",
      "/dashboard/acme/project/github"
    );
    expect(screen.queryByRole("link", { name: "Members" })).toBeNull();
    expect(
      screen.getByRole("link", { exact: true, name: "Feedback" })
    ).not.toHaveAttribute("aria-current");
  });

  it("lists every page of each section in the mobile menu", () => {
    viewport.mobile = true;
    render(
      <SidebarProvider persistOpen={false}>
        <OrgNavigationMenu
          pathname="/dashboard/acme/project/members/invitations"
          sections={orgSections({ isAdmin: false, slug: "acme" })}
        />
      </SidebarProvider>
    );
    const settings = screen.getByRole("list", { name: "Settings" });
    expect(
      within(settings).getByRole("link", { name: "Members" })
    ).toHaveAttribute("aria-current", "page");
    expect(within(settings).queryByRole("link", { name: "Trash" })).toBeNull();
    const developer = screen.getByRole("list", { name: "Developer" });
    expect(
      within(developer).getByRole("link", { name: "GitHub" })
    ).toBeVisible();
    expect(
      within(developer).queryByRole("link", { name: "In-app" })
    ).toBeNull();
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

  it("keeps the upgrade one click away in the rail", () => {
    renderSidebar();
    expect(
      screen.getByRole("link", { name: "Upgrade to Pro" })
    ).toHaveAttribute("href", "/dashboard/acme/project/billing");
  });

  it("does not offer admin actions to members", () => {
    session.role = "member";
    renderSidebar();
    expect(screen.queryByRole("link", { name: "Inbox" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Upgrade to Pro" })).toBeNull();
    expect(screen.getByRole("link", { name: "Settings" })).toBeVisible();
  });

  it("does not offer an upgrade to a paid owner", () => {
    session.tier = "pro";
    renderSidebar();
    expect(screen.queryByRole("link", { name: "Upgrade to Pro" })).toBeNull();
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
