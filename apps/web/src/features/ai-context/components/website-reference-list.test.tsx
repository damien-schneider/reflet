import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("convex/react", () => ({
  useQuery: vi.fn(() => []),
  useMutation: vi.fn(() => vi.fn()),
}));

vi.mock("@reflet/backend/convex/_generated/api", () => ({
  api: {
    website_references: {
      list: "website_references.list",
      create: "website_references.create",
      refresh: "website_references.refresh",
      remove: "website_references.remove",
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

describe("WebsiteReferenceList", () => {
  it("renders loading spinner when data is undefined", () => {
    vi.mocked(useQuery).mockReturnValue(undefined);
    const { container } = render(
      <WebsiteReferenceList isAdmin={true} organizationId={"org1" as never} />
    );
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("renders empty state when no references", () => {
    vi.mocked(useQuery).mockReturnValue([]);
    render(
      <WebsiteReferenceList isAdmin={false} organizationId={"org1" as never} />
    );
    expect(
      screen.getByText(/No website references added yet/)
    ).toBeInTheDocument();
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
      <WebsiteReferenceList isAdmin={false} organizationId={"org1" as never} />
    );
    expect(screen.getByText("https://example.com")).toBeInTheDocument();
    expect(screen.getByText("https://other.com")).toBeInTheDocument();
  });

  it("renders Add Website button for admin", () => {
    vi.mocked(useQuery).mockReturnValue([]);
    render(
      <WebsiteReferenceList isAdmin={true} organizationId={"org1" as never} />
    );
    expect(screen.getByText("Add Website")).toBeInTheDocument();
  });

  it("does not render Add Website button for non-admin", () => {
    vi.mocked(useQuery).mockReturnValue([]);
    render(
      <WebsiteReferenceList isAdmin={false} organizationId={"org1" as never} />
    );
    expect(screen.queryByText("Add Website")).not.toBeInTheDocument();
  });

  it("opens add dialog when Add Website is clicked", async () => {
    vi.mocked(useQuery).mockReturnValue([]);
    const user = userEvent.setup();
    render(
      <WebsiteReferenceList isAdmin={true} organizationId={"org1" as never} />
    );

    await user.click(screen.getByText("Add Website"));
    expect(screen.getByTestId("add-dialog")).toBeInTheDocument();
  });

  it("renders correct number of reference cards", () => {
    vi.mocked(useQuery).mockReturnValue([
      { _id: "ref1", url: "https://a.com", status: "success" },
      { _id: "ref2", url: "https://b.com", status: "success" },
      { _id: "ref3", url: "https://c.com", status: "success" },
    ]);
    render(
      <WebsiteReferenceList isAdmin={true} organizationId={"org1" as never} />
    );
    expect(screen.getAllByTestId("ref-card")).toHaveLength(3);
  });
});
