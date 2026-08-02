import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("convex/react", () => ({
  useMutation: vi.fn(() => vi.fn()),
  useQuery: vi.fn(() => []),
}));

vi.mock("@reflet/backend/convex/_generated/api", () => ({
  api: {
    integrations: {
      website_references: {
        create: "website_references.create",
        list: "website_references.list",
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
        status: "success",
        url: "https://example.com",
      },
      {
        _id: "ref2",
        status: "pending",
        url: "https://other.com",
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
      { _id: "ref1", status: "success", url: "https://a.com" },
      { _id: "ref2", status: "success", url: "https://b.com" },
      { _id: "ref3", status: "success", url: "https://c.com" },
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
