import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

const mockPush = vi.fn();
const mockPrefetch = vi.fn();
const mockRememberOrganization = vi.fn();
const rememberState = vi.hoisted(() => ({ available: true }));

vi.mock("@/features/organizations/hooks/use-active-organization", () => ({
  useRememberOrganization: () =>
    rememberState.available ? mockRememberOrganization : undefined,
}));

vi.mock("convex/react", () => ({
  useMutation: vi.fn(() => vi.fn()),
  useQuery: vi.fn(() => [
    { _id: "org1", logo: null, name: "Acme Inc", slug: "acme" },
    {
      _id: "org2",
      logo: "https://example.com/logo.png",
      name: "Beta Corp",
      slug: "beta",
    },
  ]),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    prefetch: mockPrefetch,
    push: mockPush,
  }),
}));

vi.mock("next/image", () => ({
  default: ({
    alt,
    src,
  }: {
    alt: string;
    src: string;
    className?: string;
    width?: number;
    height?: number;
  }) => <img alt={alt} src={src} />,
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@ctrl-ui/react/ui/toast", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("@ctrl-ui/react/ui/button", () => ({
  Button: ({
    children,
    disabled,
    form,
    onClick,
    type = "button",
  }: {
    children: React.ReactNode;
    disabled?: boolean;
    form?: string;
    onClick?: () => void;
    type?: "button" | "submit";
    [key: string]: unknown;
  }) => (
    <button disabled={disabled} form={form} onClick={onClick} type={type}>
      {children}
    </button>
  ),
}));

vi.mock("@ctrl-ui/react/ui/sidebar", () => ({
  useSidebar: () => ({ isMobile: false, state: "expanded" }),
}));

vi.mock("@ctrl-ui/react/ui/tooltip", async () => {
  const { cloneElement } = await import("react");
  return {
    Tooltip: ({ children }: { children: React.ReactNode }) => children,
    TooltipContent: () => null,
    TooltipTrigger: ({
      children,
      render,
    }: {
      children: React.ReactNode;
      render: React.ReactElement;
    }) => cloneElement(render, undefined, children),
  };
});

vi.mock("@ctrl-ui/react/ui/dialog", () => ({
  Dialog: ({
    children,
    open,
  }: {
    children: React.ReactNode;
    open: boolean;
    onOpenChange: (o: boolean) => void;
  }) => (open ? <div data-testid="dialog">{children}</div> : null),
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
  DialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
}));

vi.mock("@ctrl-ui/react/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuItem: ({
    children,
    onClick,
    render: Render,
  }: {
    children?: React.ReactNode;
    onClick?: () => void;
    render?: (props: Record<string, unknown>) => React.ReactNode;
  }) => {
    if (typeof Render === "function") {
      return <>{Render({})}</>;
    }
    return (
      <button onClick={onClick} type="button">
        {children}
      </button>
    );
  },
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuTrigger: ({
    children,
    render: Render,
  }: {
    children?: React.ReactNode;
    render?: React.ReactNode;
    className?: string;
  }) => (
    <div>
      {Render}
      {children}
    </div>
  ),
}));

vi.mock("@ctrl-ui/react/ui/input", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} />
  ),
}));

vi.mock("@phosphor-icons/react", () => ({
  CaretUpDown: ({ className }: { className?: string }) => (
    <svg className={className} />
  ),
  Check: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="check-icon" />
  ),
  Plus: ({ className }: { className?: string }) => (
    <svg className={className} />
  ),
}));

vi.mock("@reflet/backend/convex/_generated/api", () => ({
  api: {
    organizations: {
      mutations: {
        create: "organizations.mutations.create",
      },
      queries: {
        list: "organizations.queries.list",
      },
    },
  },
}));

import { useMutation, useQuery } from "convex/react";
import { OrganizationSwitcher } from "./organization-switcher";

afterEach(() => {
  rememberState.available = true;
  mockPush.mockClear();
  mockRememberOrganization.mockClear();
  mockPrefetch.mockClear();
});

describe("OrganizationSwitcher", () => {
  it("waits for the account before allowing organization creation", async () => {
    rememberState.available = false;
    render(<OrganizationSwitcher currentOrgSlug="acme" />);
    await userEvent.click(screen.getByText("Create organization"));
    expect(
      within(screen.getByTestId("dialog")).getByRole("button", {
        name: "Create organization",
      })
    ).toBeDisabled();
  });

  it("renders current organization name", () => {
    render(<OrganizationSwitcher currentOrgSlug="acme" />);
    expect(screen.getAllByText("Acme Inc").length).toBeGreaterThanOrEqual(1);
  });

  it("shows Select organization when no org matches", () => {
    render(<OrganizationSwitcher currentOrgSlug="nonexistent" />);
    expect(screen.getByText("Select organization")).toBeInTheDocument();
  });

  it("shows check mark for current organization", () => {
    render(<OrganizationSwitcher currentOrgSlug="acme" />);
    expect(screen.getByTestId("check-icon")).toBeInTheDocument();
  });

  it("renders loading state when organizations is undefined", () => {
    vi.mocked(useQuery).mockReturnValue(undefined);
    render(<OrganizationSwitcher currentOrgSlug="acme" />);
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("shows create dialog when Create organization is clicked", async () => {
    vi.mocked(useQuery).mockReturnValue([
      { _id: "org1", logo: null, name: "Acme", slug: "acme" },
    ]);
    const user = userEvent.setup();
    render(<OrganizationSwitcher currentOrgSlug="acme" />);

    await user.click(screen.getByText("Create organization"));
    expect(screen.getByText("Organization name")).toBeInTheDocument();
  });

  it("renders org links with correct hrefs", () => {
    vi.mocked(useQuery).mockReturnValue([
      { _id: "org1", logo: null, name: "Acme", slug: "acme" },
    ]);
    render(<OrganizationSwitcher currentOrgSlug="acme" />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/dashboard/acme");
  });

  it("renders org logo image when available", () => {
    vi.mocked(useQuery).mockReturnValue([
      {
        _id: "org1",
        logo: "https://example.com/logo.png",
        name: "Beta Corp",
        slug: "beta",
      },
    ]);
    render(<OrganizationSwitcher currentOrgSlug="beta" />);
    expect(
      document.querySelector('img[src="https://example.com/logo.png"]')
    ).toBeInTheDocument();
  });

  it("allows typing in create org input", async () => {
    vi.mocked(useQuery).mockReturnValue([
      { _id: "org1", logo: null, name: "Acme", slug: "acme" },
    ]);
    const user = userEvent.setup();
    render(<OrganizationSwitcher currentOrgSlug="acme" />);
    await user.click(screen.getByText("Create organization"));
    const input = screen.getByPlaceholderText("My Company");
    await user.type(input, "New Org");
    expect(input).toHaveValue("New Org");
  });

  it("handles empty organizations list", () => {
    vi.mocked(useQuery).mockReturnValue([]);
    render(<OrganizationSwitcher currentOrgSlug="acme" />);
    expect(screen.getByText("Select organization")).toBeInTheDocument();
  });

  it("explains and does not create org when name is empty", async () => {
    const createOrgMock = vi.fn();
    vi.mocked(useMutation).mockReturnValue(createOrgMock);
    vi.mocked(useQuery).mockReturnValue([
      { _id: "org1", logo: null, name: "Acme", slug: "acme" },
    ]);
    const user = userEvent.setup();
    render(<OrganizationSwitcher currentOrgSlug="acme" />);
    await user.click(screen.getByText("Create organization"));
    const dialog = screen.getByTestId("dialog");
    await user.click(
      within(dialog).getByRole("button", { name: "Create organization" })
    );
    expect(createOrgMock).not.toHaveBeenCalled();
    expect(
      within(dialog).getByText("Enter an organization name")
    ).toBeInTheDocument();
  });

  it("selects the newly created organization before returning to the dashboard", async () => {
    const createOrgMock = vi
      .fn()
      .mockResolvedValue({ id: "new-org", slug: "new-org-server-slug" });
    vi.mocked(useMutation).mockReturnValue(createOrgMock);
    vi.mocked(useQuery).mockReturnValue([
      { _id: "org1", logo: null, name: "Acme", slug: "acme" },
    ]);
    const user = userEvent.setup();
    render(<OrganizationSwitcher currentOrgSlug="acme" />);
    await user.click(screen.getByText("Create organization"));
    await user.type(screen.getByPlaceholderText("My Company"), "New Org");
    await user.click(
      within(screen.getByTestId("dialog")).getByRole("button", {
        name: "Create organization",
      })
    );
    expect(createOrgMock).toHaveBeenCalledWith({ name: "New Org" });
    expect(mockRememberOrganization).toHaveBeenCalledWith("new-org");
    expect(mockRememberOrganization.mock.invocationCallOrder[0]).toBeLessThan(
      mockPush.mock.invocationCallOrder[0]
    );
    expect(mockPush).toHaveBeenCalledWith("/dashboard/new-org-server-slug");
  });

  it("shows the server error next to the name field on failure", async () => {
    const createOrgMock = vi
      .fn()
      .mockRejectedValue(new Error("Duplicate name"));
    vi.mocked(useMutation).mockReturnValue(createOrgMock);
    vi.mocked(useQuery).mockReturnValue([
      { _id: "org1", logo: null, name: "Acme", slug: "acme" },
    ]);
    const user = userEvent.setup();
    render(<OrganizationSwitcher currentOrgSlug="acme" />);
    await user.click(screen.getByText("Create organization"));
    await user.type(screen.getByPlaceholderText("My Company"), "Acme");
    await user.keyboard("{Enter}");
    expect(await screen.findByText("Duplicate name")).toBeInTheDocument();
    expect(screen.getByTestId("dialog")).toBeInTheDocument();
  });

  it("shows a generic inline error for non-Error exceptions", async () => {
    const createOrgMock = vi.fn().mockRejectedValue("string error");
    vi.mocked(useMutation).mockReturnValue(createOrgMock);
    vi.mocked(useQuery).mockReturnValue([
      { _id: "org1", logo: null, name: "Acme", slug: "acme" },
    ]);
    const user = userEvent.setup();
    render(<OrganizationSwitcher currentOrgSlug="acme" />);
    await user.click(screen.getByText("Create organization"));
    await user.type(screen.getByPlaceholderText("My Company"), "New Org");
    await user.keyboard("{Enter}");
    expect(
      await screen.findByText("Unable to create the organization. Try again.")
    ).toBeInTheDocument();
  });

  it("submits on Enter key in the input", async () => {
    const createOrgMock = vi
      .fn()
      .mockResolvedValue({ id: "new-org", slug: "new-org-server-slug" });
    vi.mocked(useMutation).mockReturnValue(createOrgMock);
    vi.mocked(useQuery).mockReturnValue([
      { _id: "org1", logo: null, name: "Acme", slug: "acme" },
    ]);
    const user = userEvent.setup();
    render(<OrganizationSwitcher currentOrgSlug="acme" />);
    await user.click(screen.getByText("Create organization"));
    const input = screen.getByPlaceholderText("My Company");
    await user.type(input, "Enter Org");
    await user.keyboard("{Enter}");
    expect(createOrgMock).toHaveBeenCalledWith({ name: "Enter Org" });
  });

  it("filters out null entries in orgs list", () => {
    vi.mocked(useQuery).mockReturnValue([
      null,
      { _id: "org1", logo: null, name: "Acme", slug: "acme" },
    ]);
    render(<OrganizationSwitcher currentOrgSlug="acme" />);
    expect(screen.getAllByText("Acme").length).toBeGreaterThanOrEqual(1);
  });

  it("prefetches routes for non-current orgs", () => {
    vi.mocked(useQuery).mockReturnValue([
      { _id: "org1", logo: null, name: "Acme", slug: "acme" },
      { _id: "org2", logo: null, name: "Beta", slug: "beta" },
    ]);
    render(<OrganizationSwitcher currentOrgSlug="acme" />);
    expect(mockPrefetch).toHaveBeenCalledWith("/dashboard/beta");
  });
});
