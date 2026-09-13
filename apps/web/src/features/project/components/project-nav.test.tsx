import { activeSkin } from "@ctrl-ui/react/skin";
import {
  Sidebar,
  SidebarMenu,
  SidebarProvider,
  SidebarTrigger,
} from "@ctrl-ui/react/ui/sidebar";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { ProjectNav } from "./project-nav";

const navigation = vi.hoisted(() => ({ pathname: "/dashboard/acme" }));
const originalIndicators = activeSkin().indicators;

beforeAll(() => {
  activeSkin().indicators = { sidebar: "none" };
});

afterAll(() => {
  activeSkin().indicators = originalIndicators;
});

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
}));

function renderProjectNav(defaultOpen = true) {
  return render(
    <SidebarProvider defaultOpen={defaultOpen} persistOpen={false}>
      <SidebarTrigger />
      <Sidebar collapsible="icon">
        <SidebarMenu indicator="none">
          <ProjectNav baseUrl="/dashboard/acme/project" />
        </SidebarMenu>
      </Sidebar>
    </SidebarProvider>
  );
}

beforeEach(() => {
  navigation.pathname = "/dashboard/acme";
  vi.stubGlobal(
    "matchMedia",
    vi.fn((media: string) => ({
      addEventListener: vi.fn(),
      matches: false,
      media,
      removeEventListener: vi.fn(),
    }))
  );
});

afterEach(() => vi.unstubAllGlobals());

describe("Project sidebar submenu", () => {
  it("opens with the keyboard without navigating away from feedback", async () => {
    const user = userEvent.setup();
    renderProjectNav();

    const project = screen.getByRole("button", { name: "Project" });
    expect(project).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("link", { name: "GitHub" })).toBeNull();

    await user.tab();
    await user.tab();
    expect(project).toHaveFocus();
    await user.keyboard("{Enter}");

    expect(project).toHaveAttribute("aria-expanded", "true");
    expect(screen.getAllByRole("link")).toHaveLength(7);
    await user.tab();
    expect(screen.getByRole("link", { name: "GitHub" })).toHaveFocus();
    expect(screen.getByRole("link", { name: "Billing" })).toHaveAttribute(
      "href",
      "/dashboard/acme/project/billing"
    );
  });

  it("reveals and marks the current section on a nested project route", () => {
    navigation.pathname = "/dashboard/acme/project/members/invitations";
    renderProjectNav();

    expect(screen.getByRole("button", { name: "Project" })).toHaveAttribute(
      "aria-expanded",
      "true"
    );
    expect(screen.getByRole("link", { name: "Members" })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(screen.getByRole("link", { name: "GitHub" })).not.toHaveAttribute(
      "aria-current"
    );
  });

  it("expands the collapsed sidebar even when the active submenu was open", async () => {
    navigation.pathname = "/dashboard/acme/project/github";
    const user = userEvent.setup();
    renderProjectNav(false);

    await user.click(screen.getByRole("button", { name: "Project" }));

    expect(
      screen.getByRole("button", { name: "Toggle Sidebar" })
    ).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: "Project" })).toHaveAttribute(
      "aria-expanded",
      "true"
    );
    expect(screen.getByRole("link", { name: "GitHub" })).toBeVisible();
  });
});
