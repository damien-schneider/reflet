import { SidebarProvider, SidebarTrigger } from "@ctrl-ui/react/ui/sidebar";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getFunctionName } from "convex/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardSidebar } from "@/features/dashboard/components/dashboard-sidebar";
import { OrgNavigationMenu } from "@/features/dashboard/components/navigation/org-navigation";
import { orgSections } from "@/features/dashboard/components/navigation/org-sections";
import {
  SectionPanel,
  SectionPanelHost,
} from "@/features/dashboard/components/section-panel";

const session = vi.hoisted(() => ({
  isPublic: true,
  role: "owner",
  tier: "free",
}));
const updateOrganization = vi.hoisted(() => vi.fn());
const viewport = vi.hoisted(() => ({ mobile: false }));

vi.mock("convex/react", () => ({
  useMutation: () => updateOrganization,
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
            isPublic: session.isPublic,
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
vi.mock("@/lib/auth-client", () => ({ authClient: { signOut: vi.fn() } }));
vi.mock("@/lib/analytics", () => ({ capture: vi.fn() }));
vi.mock("posthog-js", () => ({ default: { reset: vi.fn() } }));
vi.mock("next/navigation", () => ({
  useParams: () => ({ orgSlug: "acme" }),
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
Element.prototype.checkVisibility = () => true;

beforeEach(() => {
  session.isPublic = true;
  session.role = "owner";
  session.tier = "free";
  updateOrganization.mockReset().mockResolvedValue(null);
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

function renderSectionPanel() {
  return render(
    <SidebarProvider persistOpen={false}>
      <SectionPanelHost>
        <SectionPanel title="Feedback">
          <p>All feedback</p>
        </SectionPanel>
      </SectionPanelHost>
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

  it("pins docs, the public page and the upgrade under the section panel", () => {
    const { container } = renderSectionPanel();
    const footer = container.querySelector('[data-slot="footer"]');
    const links = screen
      .getAllByRole("link")
      .filter((link) => footer?.contains(link));
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/docs",
      "/acme",
      "/dashboard/acme/project/billing",
    ]);
    for (const link of links.slice(0, 2)) {
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener");
      expect(link).toHaveAccessibleName(/opens in a new tab/);
    }
    expect(links[2]).toHaveAccessibleName("Upgrade to Pro");
  });

  it("renders those links in the rail footer for pages without a panel", () => {
    renderSidebar("/dashboard/acme/status");
    const footer = screen
      .getAllByRole("link")
      .filter((link) => link.closest('[data-slot="footer"]'));
    expect(footer.map((link) => link.getAttribute("href"))).toEqual([
      "/docs",
      "/acme",
      "/dashboard/acme/project/billing",
    ]);
  });

  it("offers to make a private organization public in the public page slot", async () => {
    session.isPublic = false;
    renderSectionPanel();
    expect(screen.queryByRole("link", { name: /Open public page/ })).toBeNull();
    await userEvent.click(
      screen.getByRole("button", { name: "Make organization public" })
    );
    expect(updateOrganization).toHaveBeenCalledWith({
      id: "org1",
      isPublic: true,
    });
  });

  it("does not let members make the organization public", () => {
    session.isPublic = false;
    session.role = "member";
    renderSectionPanel();
    expect(
      screen.queryByRole("button", { name: "Make organization public" })
    ).toBeNull();
    expect(screen.queryByRole("link", { name: /Open public page/ })).toBeNull();
  });

  it("keeps those links in the mobile menu, where the panel is hidden", async () => {
    viewport.mobile = true;
    render(
      <SidebarProvider persistOpen={false}>
        <SidebarTrigger label="Open navigation" />
        <DashboardSidebar orgSlug="acme" pathname="/dashboard/acme" />
      </SidebarProvider>
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Open navigation" })
    );
    expect(
      await screen.findByRole("link", { name: "Upgrade to Pro" })
    ).toHaveAttribute("href", "/dashboard/acme/project/billing");
    expect(screen.getByRole("link", { name: /Docs/ })).toHaveAttribute(
      "href",
      "/docs"
    );
  });

  it("does not offer admin actions to members", () => {
    session.role = "member";
    renderSidebar();
    renderSectionPanel();
    expect(screen.queryByRole("link", { name: "Inbox" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Upgrade to Pro" })).toBeNull();
    expect(screen.getByRole("link", { name: "Settings" })).toBeVisible();
  });

  it("does not offer an upgrade to a paid owner", () => {
    session.tier = "pro";
    renderSectionPanel();
    expect(screen.queryByRole("link", { name: "Upgrade to Pro" })).toBeNull();
    expect(
      screen.getByRole("link", { name: /Open public page/ })
    ).toBeVisible();
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
