import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

const mockPush = vi.fn();
const mockPrefetch = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: vi.fn(() => [
    { _id: "org1", name: "Acme Inc", slug: "acme", logo: null },
    {
      _id: "org2",
      name: "Beta Corp",
      slug: "beta",
      logo: "https://example.com/logo.png",
    },
  ]),
  useMutation: vi.fn(() => vi.fn()),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    prefetch: mockPrefetch,
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

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    disabled,
    onClick,
    ...rest
  }: {
    children: React.ReactNode;
    disabled?: boolean;
    onClick?: () => void;
    [key: string]: unknown;
  }) => (
    <button disabled={disabled} onClick={onClick} type="button">
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/dialog", () => ({
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
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
  DialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownList: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownListContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownListItem: ({
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
  DropdownListSeparator: () => <hr />,
  DropdownListTrigger: ({
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

vi.mock("@/components/ui/input", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} />
  ),
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({
    children,
    htmlFor,
  }: {
    children: React.ReactNode;
    htmlFor?: string;
  }) => <label htmlFor={htmlFor}>{children}</label>,
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
      list: "organizations.list",
      create: "organizations.create",
    },
  },
}));

import { useQuery } from "convex/react";
import { OrganizationSwitcher } from "./organization-switcher";

afterEach(() => {
  cleanup();
  mockPush.mockClear();
  mockPrefetch.mockClear();
});

describe("OrganizationSwitcher", () => {
  it("renders current organization name", () => {
    render(<OrganizationSwitcher currentOrgSlug="acme" />);
    expect(screen.getAllByText("Acme Inc").length).toBeGreaterThanOrEqual(1);
  });

  it("shows Select organization when no org matches", () => {
    render(<OrganizationSwitcher currentOrgSlug="nonexistent" />);
    expect(screen.getByText("Select organization")).toBeInTheDocument();
  });

  it("renders all organizations in dropdown", () => {
    render(<OrganizationSwitcher currentOrgSlug="acme" />);
    expect(screen.getAllByText("Acme Inc").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Beta Corp").length).toBeGreaterThanOrEqual(1);
  });

  it("renders Create organization option", () => {
    render(<OrganizationSwitcher currentOrgSlug="acme" />);
    expect(screen.getByText("Create organization")).toBeInTheDocument();
  });

  it("shows check mark for current organization", () => {
    render(<OrganizationSwitcher currentOrgSlug="acme" />);
    expect(screen.getByTestId("check-icon")).toBeInTheDocument();
  });

  it("renders loading state when organizations is undefined", () => {
    vi.mocked(useQuery).mockReturnValue(undefined);
    render(<OrganizationSwitcher currentOrgSlug="acme" />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("shows create dialog when Create organization is clicked", async () => {
    vi.mocked(useQuery).mockReturnValue([
      { _id: "org1", name: "Acme", slug: "acme", logo: null },
    ]);
    const user = userEvent.setup();
    render(<OrganizationSwitcher currentOrgSlug="acme" />);

    await user.click(screen.getByText("Create organization"));
    expect(screen.getByText("Organization name")).toBeInTheDocument();
  });

  it("renders org links with correct hrefs", () => {
    vi.mocked(useQuery).mockReturnValue([
      { _id: "org1", name: "Acme", slug: "acme", logo: null },
    ]);
    render(<OrganizationSwitcher currentOrgSlug="acme" />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/dashboard/acme");
  });

  it("renders org logo image when available", () => {
    vi.mocked(useQuery).mockReturnValue([
      {
        _id: "org1",
        name: "Beta Corp",
        slug: "beta",
        logo: "https://example.com/logo.png",
      },
    ]);
    render(<OrganizationSwitcher currentOrgSlug="beta" />);
    const images = screen.getAllByAltText("Beta Corp");
    expect(images.length).toBeGreaterThanOrEqual(1);
  });

  it("renders first letter fallback when no logo", () => {
    vi.mocked(useQuery).mockReturnValue([
      { _id: "org1", name: "Acme", slug: "acme", logo: null },
    ]);
    render(<OrganizationSwitcher currentOrgSlug="acme" />);
    expect(screen.getAllByText("A").length).toBeGreaterThanOrEqual(1);
  });

  it("renders create dialog input field", async () => {
    vi.mocked(useQuery).mockReturnValue([
      { _id: "org1", name: "Acme", slug: "acme", logo: null },
    ]);
    const user = userEvent.setup();
    render(<OrganizationSwitcher currentOrgSlug="acme" />);
    await user.click(screen.getByText("Create organization"));
    expect(screen.getByPlaceholderText("My Company")).toBeInTheDocument();
  });

  it("renders create dialog with Create button", async () => {
    vi.mocked(useQuery).mockReturnValue([
      { _id: "org1", name: "Acme", slug: "acme", logo: null },
    ]);
    const user = userEvent.setup();
    render(<OrganizationSwitcher currentOrgSlug="acme" />);
    await user.click(screen.getByText("Create organization"));
    expect(screen.getByText("Create")).toBeInTheDocument();
  });

  it("allows typing in create org input", async () => {
    vi.mocked(useQuery).mockReturnValue([
      { _id: "org1", name: "Acme", slug: "acme", logo: null },
    ]);
    const user = userEvent.setup();
    render(<OrganizationSwitcher currentOrgSlug="acme" />);
    await user.click(screen.getByText("Create organization"));
    const input = screen.getByPlaceholderText("My Company");
    await user.type(input, "New Org");
    expect(input).toHaveValue("New Org");
  });

  it("renders separator between org list and create option", () => {
    vi.mocked(useQuery).mockReturnValue([
      { _id: "org1", name: "Acme", slug: "acme", logo: null },
    ]);
    render(<OrganizationSwitcher currentOrgSlug="acme" />);
    expect(document.querySelector("hr")).toBeInTheDocument();
  });

  it("renders with org data loaded", () => {
    vi.mocked(useQuery).mockReturnValue([
      { _id: "org1", name: "Acme", slug: "acme", logo: null },
    ]);
    const { container } = render(
      <OrganizationSwitcher currentOrgSlug="acme" />
    );
    expect(container.querySelector("a")).toBeInTheDocument();
  });

  it("renders multiple org links", () => {
    vi.mocked(useQuery).mockReturnValue([
      { _id: "org1", name: "Acme", slug: "acme", logo: null },
      { _id: "org2", name: "Beta", slug: "beta", logo: null },
    ]);
    render(<OrganizationSwitcher currentOrgSlug="acme" />);
    const links = screen.getAllByRole("link");
    expect(links.length).toBeGreaterThanOrEqual(2);
  });

  it("handles empty organizations list", () => {
    vi.mocked(useQuery).mockReturnValue([]);
    render(<OrganizationSwitcher currentOrgSlug="acme" />);
    expect(screen.getByText("Select organization")).toBeInTheDocument();
  });

  it("renders org name in the trigger", () => {
    vi.mocked(useQuery).mockReturnValue([
      { _id: "org1", name: "Acme", slug: "acme", logo: null },
    ]);
    render(<OrganizationSwitcher currentOrgSlug="acme" />);
    expect(screen.getAllByText("Acme").length).toBeGreaterThanOrEqual(1);
  });

  it("does not show check mark for non-current org", () => {
    vi.mocked(useQuery).mockReturnValue([
      { _id: "org1", name: "Acme", slug: "acme", logo: null },
      { _id: "org2", name: "Beta", slug: "beta", logo: null },
    ]);
    render(<OrganizationSwitcher currentOrgSlug="acme" />);
    const checkIcons = screen.getAllByTestId("check-icon");
    // Only one check icon for the current org
    expect(checkIcons).toHaveLength(1);
  });

  it("shows create organization option", () => {
    vi.mocked(useQuery).mockReturnValue([
      { _id: "org1", name: "Acme", slug: "acme", logo: null },
    ]);
    render(<OrganizationSwitcher currentOrgSlug="acme" />);
    expect(screen.getByText("Create organization")).toBeInTheDocument();
  });

  it("does not create org when name is empty", async () => {
    const createOrgMock = vi.fn();
    const { useMutation } = await import("convex/react");
    vi.mocked(useMutation).mockReturnValue(createOrgMock);
    vi.mocked(useQuery).mockReturnValue([
      { _id: "org1", name: "Acme", slug: "acme", logo: null },
    ]);
    const user = userEvent.setup();
    render(<OrganizationSwitcher currentOrgSlug="acme" />);
    await user.click(screen.getByText("Create organization"));
    await user.click(screen.getByText("Create"));
    expect(createOrgMock).not.toHaveBeenCalled();
  });

  it("creates org and navigates to dashboard on success", async () => {
    const createOrgMock = vi.fn().mockResolvedValue({ _id: "new-org" });
    const { useMutation } = await import("convex/react");
    vi.mocked(useMutation).mockReturnValue(createOrgMock);
    vi.mocked(useQuery).mockReturnValue([
      { _id: "org1", name: "Acme", slug: "acme", logo: null },
    ]);
    const user = userEvent.setup();
    render(<OrganizationSwitcher currentOrgSlug="acme" />);
    await user.click(screen.getByText("Create organization"));
    await user.type(screen.getByPlaceholderText("My Company"), "New Org");
    await user.click(screen.getByText("Create"));
    expect(createOrgMock).toHaveBeenCalledWith({ name: "New Org" });
    expect(mockPush).toHaveBeenCalledWith("/dashboard");
  });

  it("shows error toast on create org failure", async () => {
    const createOrgMock = vi
      .fn()
      .mockRejectedValue(new Error("Duplicate name"));
    const { useMutation } = await import("convex/react");
    vi.mocked(useMutation).mockReturnValue(createOrgMock);
    const { toast } = await import("sonner");
    vi.mocked(useQuery).mockReturnValue([
      { _id: "org1", name: "Acme", slug: "acme", logo: null },
    ]);
    const user = userEvent.setup();
    render(<OrganizationSwitcher currentOrgSlug="acme" />);
    await user.click(screen.getByText("Create organization"));
    await user.type(screen.getByPlaceholderText("My Company"), "Acme");
    await user.click(screen.getByText("Create"));
    expect(toast.error).toHaveBeenCalledWith("Duplicate name");
  });

  it("shows generic error toast for non-Error exceptions", async () => {
    const createOrgMock = vi.fn().mockRejectedValue("string error");
    const { useMutation } = await import("convex/react");
    vi.mocked(useMutation).mockReturnValue(createOrgMock);
    const { toast } = await import("sonner");
    vi.mocked(useQuery).mockReturnValue([
      { _id: "org1", name: "Acme", slug: "acme", logo: null },
    ]);
    const user = userEvent.setup();
    render(<OrganizationSwitcher currentOrgSlug="acme" />);
    await user.click(screen.getByText("Create organization"));
    await user.type(screen.getByPlaceholderText("My Company"), "New Org");
    await user.click(screen.getByText("Create"));
    expect(toast.error).toHaveBeenCalledWith("Failed to create organization");
  });

  it("submits on Enter key in the input", async () => {
    const createOrgMock = vi.fn().mockResolvedValue({ _id: "new-org" });
    const { useMutation } = await import("convex/react");
    vi.mocked(useMutation).mockReturnValue(createOrgMock);
    vi.mocked(useQuery).mockReturnValue([
      { _id: "org1", name: "Acme", slug: "acme", logo: null },
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
      { _id: "org1", name: "Acme", slug: "acme", logo: null },
    ]);
    render(<OrganizationSwitcher currentOrgSlug="acme" />);
    expect(screen.getAllByText("Acme").length).toBeGreaterThanOrEqual(1);
  });

  it("prefetches routes for non-current orgs", () => {
    vi.mocked(useQuery).mockReturnValue([
      { _id: "org1", name: "Acme", slug: "acme", logo: null },
      { _id: "org2", name: "Beta", slug: "beta", logo: null },
    ]);
    render(<OrganizationSwitcher currentOrgSlug="acme" />);
    expect(mockPrefetch).toHaveBeenCalledWith("/dashboard/beta");
  });

  it("does not prefetch current org route", () => {
    vi.mocked(useQuery).mockReturnValue([
      { _id: "org1", name: "Acme", slug: "acme", logo: null },
    ]);
    render(<OrganizationSwitcher currentOrgSlug="acme" />);
    expect(mockPrefetch).not.toHaveBeenCalledWith("/dashboard/acme");
  });

  it("renders OrgIcon fallback when org has no logo and no name match", () => {
    vi.mocked(useQuery).mockReturnValue([
      { _id: "org1", name: "Acme", slug: "acme", logo: null },
    ]);
    render(<OrganizationSwitcher currentOrgSlug="nonexistent" />);
    expect(screen.getByText("Select organization")).toBeInTheDocument();
  });
});
