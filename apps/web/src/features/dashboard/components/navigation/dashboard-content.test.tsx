import { DashboardContent } from "@app/(app)/dashboard/dashboard-content";
import { AppShell } from "@ctrl-ui/react/ui/app-shell";
import { act, render, screen, within } from "@testing-library/react";
import { getFunctionName } from "convex/server";
import { createStore, Provider } from "jotai";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { organizationSelectionAtom } from "@/features/organizations/lib/organization-selection";

const dashboard = vi.hoisted<{
  orgSlug: string | undefined;
  organizations:
    | { _id: string; name: string; role: string; slug: string }[]
    | undefined;
  pathname: string;
  replace: ReturnType<typeof vi.fn>;
  userId: string | null | undefined;
}>(() => ({
  organizations: [],
  orgSlug: "acme",
  pathname: "/dashboard/acme",
  replace: vi.fn(),
  userId: "user1",
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ orgSlug: dashboard.orgSlug }),
  usePathname: () => dashboard.pathname,
  useRouter: () => ({ replace: dashboard.replace }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("convex/react", () => ({
  useQuery: (query: Parameters<typeof getFunctionName>[0]) => {
    switch (getFunctionName(query)) {
      case "auth/queries:getCurrentUser":
        return dashboard.userId ? { _id: dashboard.userId } : dashboard.userId;
      case "organizations/queries:list":
        return dashboard.organizations;
      case "organizations/queries:getBySlug":
        return (
          dashboard.organizations?.find(
            (org) => org.slug === dashboard.orgSlug
          ) ?? null
        );
      default:
        return;
    }
  },
}));

vi.mock("@/features/dashboard/components/dashboard-sidebar", () => ({
  DashboardSidebar: ({ orgSlug }: { orgSlug?: string }) => (
    <nav aria-label="Workspace">
      <span>{orgSlug ?? "Select organization"}</span>
      {orgSlug ? <a href={`/dashboard/${orgSlug}`}>Feedback</a> : null}
    </nav>
  ),
}));

vi.mock("@/features/command-palette/components/command-palette", () => ({
  CommandPalette: ({ orgSlug }: { orgSlug?: string }) => (
    <span data-testid="command-workspace">{orgSlug}</span>
  ),
}));

vi.mock("@/features/dashboard/components/support/dashboard-feedback", () => ({
  DashboardFeedback: () => null,
}));
vi.mock("@/features/dashboard/components/support/dashboard-support", () => ({
  DashboardSupport: () => null,
}));
vi.mock("@/components/ui/theme-toggle", () => ({ ThemeToggle: () => null }));
vi.mock("@app/(app)/dashboard/dashboard-states", () => ({
  OrgPicker: () => <p>Select an organization</p>,
  OrgPickerSkeleton: () => <p>Loading organizations</p>,
  WelcomeState: () => <p>Welcome to Reflet</p>,
}));

Element.prototype.getAnimations = () => [];

beforeEach(() => {
  dashboard.orgSlug = "acme";
  dashboard.organizations = [
    { _id: "org1", name: "Acme", role: "owner", slug: "acme" },
    { _id: "org2", name: "Beta", role: "member", slug: "beta" },
  ];
  dashboard.pathname = "/dashboard/acme";
  dashboard.userId = "user1";
  dashboard.replace.mockClear();
  localStorage.clear();
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      addEventListener: vi.fn(),
      matches: false,
      removeEventListener: vi.fn(),
    }))
  );
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
      unobserve() {}
    }
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function renderDashboard(children: ReactNode = <h1>Account settings</h1>) {
  const store = createStore();
  const content = () => (
    <Provider store={store}>
      <AppShell scroll="page">
        <DashboardContent>{children}</DashboardContent>
      </AppShell>
    </Provider>
  );
  return { ...render(content()), content, store };
}

describe("Dashboard workspace context", () => {
  it("keeps workspace navigation and the header when a page fails", () => {
    let fails = true;
    function FailingPage() {
      if (fails) {
        throw new Error("Inbox query failed");
      }
      return <h1>Inbox</h1>;
    }
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { container } = renderDashboard(<FailingPage />);

    expect(screen.getByRole("link", { name: "Feedback" })).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Open navigation" })
    ).toBeVisible();
    expect(
      container.querySelector("[data-app-shell-content]")
    ).toContainElement(screen.getByRole("alert"));

    fails = false;
    act(() => screen.getByRole("button", { name: "Try again" }).click());
    expect(screen.getByRole("heading", { name: "Inbox" })).toBeVisible();
  });

  it("opens the section's own panel beside the page", async () => {
    dashboard.pathname = "/dashboard/acme/project/members";
    renderDashboard(<h1>Members</h1>);
    const panel = await screen.findByRole("list", { name: "Settings" });
    expect(
      within(panel).getByRole("link", { name: "Members" })
    ).toHaveAttribute("aria-current", "page");
    expect(within(panel).getByRole("link", { name: "Trash" })).toBeVisible();
  });

  it("leaves pages outside a multi-page section without a panel", () => {
    dashboard.pathname = "/dashboard/acme/changelog";
    renderDashboard(<h1>Changelog</h1>);
    expect(screen.queryByRole("list", { name: "Settings" })).toBeNull();
    expect(screen.queryByRole("list", { name: "Developer" })).toBeNull();
  });

  it("preserves organization navigation and search on account settings", () => {
    const view = renderDashboard();
    dashboard.orgSlug = undefined;
    dashboard.pathname = "/dashboard/account";
    view.rerender(view.content());

    expect(
      screen.getByRole("heading", { name: "Account settings" })
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "Feedback" })).toHaveAttribute(
      "href",
      "/dashboard/acme"
    );
    expect(screen.getByTestId("command-workspace")).toHaveTextContent("acme");
    expect(dashboard.replace).not.toHaveBeenCalled();
  });

  it("returns to the selected organization from the dashboard root", () => {
    const view = renderDashboard();
    dashboard.orgSlug = undefined;
    dashboard.pathname = "/dashboard";
    view.rerender(view.content());

    expect(dashboard.replace).toHaveBeenCalledWith("/dashboard/acme");
  });

  it("restores the workspace after reloading account settings", () => {
    renderDashboard().unmount();
    dashboard.orgSlug = undefined;
    dashboard.pathname = "/dashboard/account";
    renderDashboard();

    expect(screen.getByRole("link", { name: "Feedback" })).toHaveAttribute(
      "href",
      "/dashboard/acme"
    );
    expect(dashboard.replace).not.toHaveBeenCalled();
  });

  it("opens the newly selected organization without restoring the old route's selection", () => {
    const view = renderDashboard();
    act(() =>
      view.store.set(organizationSelectionAtom, {
        organizationId: "org2",
        userId: "user1",
      })
    );
    view.rerender(view.content());
    dashboard.orgSlug = undefined;
    dashboard.pathname = "/dashboard";
    view.rerender(view.content());

    expect(dashboard.replace).toHaveBeenCalledWith("/dashboard/beta");
  });

  it("follows organization URLs when switching and going back", () => {
    const view = renderDashboard();
    for (const slug of ["beta", "acme"]) {
      dashboard.orgSlug = slug;
      dashboard.pathname = `/dashboard/${slug}`;
      view.rerender(view.content());
      dashboard.orgSlug = undefined;
      dashboard.pathname = "/dashboard/account";
      view.rerender(view.content());
      expect(screen.getByRole("link", { name: "Feedback" })).toHaveAttribute(
        "href",
        `/dashboard/${slug}`
      );
    }
  });

  it("uses the latest organization URL after a rename", () => {
    const view = renderDashboard();
    dashboard.organizations = [
      {
        _id: "org1",
        name: "Acme renamed",
        role: "owner",
        slug: "acme-renamed",
      },
      { _id: "org2", name: "Beta", role: "member", slug: "beta" },
    ];
    dashboard.orgSlug = undefined;
    dashboard.pathname = "/dashboard/account";
    view.rerender(view.content());

    expect(screen.getByRole("link", { name: "Feedback" })).toHaveAttribute(
      "href",
      "/dashboard/acme-renamed"
    );
  });

  it("drops workspace context after membership is lost", () => {
    const view = renderDashboard();
    dashboard.organizations = [
      { _id: "org2", name: "Beta", role: "member", slug: "beta" },
      { _id: "org3", name: "Gamma", role: "member", slug: "gamma" },
    ];
    dashboard.orgSlug = undefined;
    dashboard.pathname = "/dashboard/account";
    view.rerender(view.content());

    expect(screen.queryByRole("link", { name: "Feedback" })).toBeNull();
    expect(
      screen.getByRole("heading", { name: "Account settings" })
    ).toBeVisible();
  });

  it("does not reuse another account's remembered selection", () => {
    const view = renderDashboard();
    dashboard.userId = "user2";
    dashboard.orgSlug = undefined;
    dashboard.pathname = "/dashboard/account";
    view.rerender(view.content());

    expect(screen.queryByRole("link", { name: "Feedback" })).toBeNull();
    expect(screen.getByTestId("command-workspace")).toBeEmptyDOMElement();
  });

  it("does not replace an inaccessible organization URL with the remembered workspace", () => {
    const view = renderDashboard();
    dashboard.orgSlug = "inaccessible";
    dashboard.pathname = "/dashboard/inaccessible";
    view.rerender(view.content());

    expect(
      screen.getByRole("heading", { name: "Organization not found" })
    ).toBeVisible();
    expect(screen.queryByRole("link", { name: "Feedback" })).toBeNull();
    expect(dashboard.replace).not.toHaveBeenCalled();
  });

  it("keeps the remembered selection while organizations load", () => {
    const view = renderDashboard();
    const organizations = dashboard.organizations;
    dashboard.organizations = undefined;
    dashboard.orgSlug = undefined;
    dashboard.pathname = "/dashboard/account";
    view.rerender(view.content());
    dashboard.organizations = organizations;
    view.rerender(view.content());

    expect(screen.getByRole("link", { name: "Feedback" })).toHaveAttribute(
      "href",
      "/dashboard/acme"
    );
  });

  it("keeps account settings available before an organization is created", () => {
    dashboard.orgSlug = undefined;
    dashboard.pathname = "/dashboard/account";
    dashboard.organizations = [];
    renderDashboard();

    expect(
      screen.getByRole("heading", { name: "Account settings" })
    ).toBeVisible();
    expect(screen.queryByRole("link", { name: "Feedback" })).toBeNull();
    expect(dashboard.replace).not.toHaveBeenCalled();
  });

  it("provides the sole workspace on a direct account visit without leaving settings", () => {
    dashboard.orgSlug = undefined;
    dashboard.pathname = "/dashboard/account";
    dashboard.organizations = [
      { _id: "org1", name: "Acme", role: "owner", slug: "acme" },
    ];
    renderDashboard();

    expect(screen.getByRole("link", { name: "Feedback" })).toHaveAttribute(
      "href",
      "/dashboard/acme"
    );
    expect(dashboard.replace).not.toHaveBeenCalled();
  });

  it.each(["invalid json", '{"organizationId":42,"userId":"user1"}'])(
    "ignores malformed remembered state: %s",
    (storedSelection) => {
      localStorage.setItem("reflet-organization-selection", storedSelection);
      dashboard.orgSlug = undefined;
      dashboard.pathname = "/dashboard/account";
      renderDashboard();

      expect(screen.queryByRole("link", { name: "Feedback" })).toBeNull();
      expect(
        screen.getByRole("heading", { name: "Account settings" })
      ).toBeVisible();
    }
  );

  it("keeps in-session navigation working when storage writes are blocked", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Storage blocked", "QuotaExceededError");
    });
    const warning = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    const view = renderDashboard();
    dashboard.orgSlug = undefined;
    dashboard.pathname = "/dashboard/account";
    view.rerender(view.content());

    expect(screen.getByRole("link", { name: "Feedback" })).toHaveAttribute(
      "href",
      "/dashboard/acme"
    );
    expect(warning).toHaveBeenCalledWith(
      "Unable to remember the selected organization",
      expect.any(DOMException)
    );
  });
});
