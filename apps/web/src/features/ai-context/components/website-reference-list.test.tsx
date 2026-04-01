import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("convex/react", () => ({
  useQuery: vi.fn(() => []),
  useMutation: vi.fn(() => vi.fn()),
}));

vi.mock("@reflet/backend/convex/_generated/api", () => ({
  api: {
    integrations: {
      website_references: {
        list: "website_references.list",
        create: "website_references.create",
        refresh: "website_references.refresh",
        remove: "website_references.remove",
      },
    },
  },
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: string;
  }) => (
    <button onClick={onClick} type="button">
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/typography", () => ({
  Muted: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <div className={className}>{children}</div>,
}));

vi.mock("@phosphor-icons/react", () => ({
  Plus: ({ className }: { className?: string }) => (
    <svg className={className} />
  ),
}));

vi.mock("./add-website-dialog", () => ({
  AddWebsiteDialog: ({
    open,
  }: {
    open: boolean;
    onOpenChange: (o: boolean) => void;
    organizationId: unknown;
  }) => (open ? <div data-testid="add-dialog">Add Website Dialog</div> : null),
}));

vi.mock("./website-reference-card", () => ({
  WebsiteReferenceCard: ({
    reference,
  }: {
    reference: { url: string };
    isAdmin: boolean;
  }) => <div data-testid="ref-card">{reference.url}</div>,
}));

import { useQuery } from "convex/react";
import { WebsiteReferenceList } from "./website-reference-list";

afterEach(cleanup);

const mockDialogState = { isOpen: false, setIsOpen: vi.fn() };

describe("WebsiteReferenceList", () => {
  it("renders loading spinner when data is undefined", () => {
    vi.mocked(useQuery).mockReturnValue(undefined);
    const { container } = render(
      <WebsiteReferenceList
        dialogState={mockDialogState}
        isAdmin={true}
        organizationId={"org1" as never}
      />
    );
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("renders empty state when no references", () => {
    vi.mocked(useQuery).mockReturnValue([]);
    render(
      <WebsiteReferenceList
        dialogState={mockDialogState}
        isAdmin={false}
        organizationId={"org1" as never}
      />
    );
    expect(screen.getByText("Nothing yet")).toBeInTheDocument();
  });

  it("renders references list", () => {
    vi.mocked(useQuery).mockReturnValue([
      {
        _id: "ref1",
        url: "https://example.com",
        status: "success",
      },
      {
        _id: "ref2",
        url: "https://other.com",
        status: "pending",
      },
    ]);
    render(
      <WebsiteReferenceList
        dialogState={mockDialogState}
        isAdmin={false}
        organizationId={"org1" as never}
      />
    );
    expect(screen.getByText("https://example.com")).toBeInTheDocument();
    expect(screen.getByText("https://other.com")).toBeInTheDocument();
  });

  it("renders correct number of reference cards", () => {
    vi.mocked(useQuery).mockReturnValue([
      { _id: "ref1", url: "https://a.com", status: "success" },
      { _id: "ref2", url: "https://b.com", status: "success" },
      { _id: "ref3", url: "https://c.com", status: "success" },
    ]);
    render(
      <WebsiteReferenceList
        dialogState={mockDialogState}
        isAdmin={true}
        organizationId={"org1" as never}
      />
    );
    expect(screen.getAllByTestId("ref-card")).toHaveLength(3);
  });
});
