import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@phosphor-icons/react", () => ({
  Calendar: () => <svg data-testid="calendar-icon" />,
  Check: () => <svg data-testid="check-icon" />,
  DotsThreeVertical: () => <svg data-testid="dots-icon" />,
  Eye: () => <svg data-testid="eye-icon" />,
  EyeSlash: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="eye-slash-icon" />
  ),
  PencilSimple: () => <svg data-testid="pencil-icon" />,
  Trash: () => <svg data-testid="trash-icon" />,
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a data-testid="next-link" href={href}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({
    children,
    variant,
    className,
  }: {
    children: React.ReactNode;
    variant?: string;
    className?: string;
  }) => (
    <span className={className} data-testid="badge" data-variant={variant}>
      {children}
    </span>
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    variant,
    size,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: string;
    size?: string;
  }) => (
    <button
      data-size={size}
      data-variant={variant}
      onClick={onClick}
      type="button"
      {...props}
    >
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownList: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown">{children}</div>
  ),
  DropdownListContent: ({
    children,
  }: {
    children: React.ReactNode;
    align?: string;
  }) => <div data-testid="dropdown-content">{children}</div>,
  DropdownListItem: ({
    children,
    onClick,
    className,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
  }) => (
    <button
      className={className}
      data-testid="dropdown-item"
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  ),
  DropdownListSeparator: () => <hr data-testid="dropdown-separator" />,
  DropdownListTrigger: ({
    render,
  }: {
    render: (props: React.ComponentProps<"button">) => React.ReactNode;
  }) => <>{render({})}</>,
}));

vi.mock("@/components/ui/tiptap/markdown-renderer", () => ({
  MarkdownRenderer: ({ content }: { content: string }) => (
    <div data-testid="markdown-renderer">{content}</div>
  ),
}));

vi.mock("@/lib/utils", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

import type { ReleaseData } from "./release-item";
import { ReleaseItem } from "./release-item";

afterEach(cleanup);

const makeRelease = (overrides: Partial<ReleaseData> = {}): ReleaseData => ({
  _id: "release1" as Id<"releases">,
  title: "New Features",
  _creationTime: 1_700_000_000_000,
  ...overrides,
});

describe("ReleaseItem", () => {
  const defaultProps = {
    release: makeRelease({
      version: "1.0.0",
      publishedAt: 1_700_000_000_000,
      description: "## Changes\n- Fixed bugs",
    }),
    orgSlug: "test-org",
  };

  it("renders the release title", () => {
    render(<ReleaseItem {...defaultProps} />);
    expect(screen.getByText("New Features")).toBeInTheDocument();
  });

  it("displays the version badge", () => {
    render(<ReleaseItem {...defaultProps} />);
    expect(screen.getByText("1.0.0")).toBeInTheDocument();
  });

  it("shows the published date", () => {
    render(<ReleaseItem {...defaultProps} />);
    expect(screen.getByText("November 14, 2023")).toBeInTheDocument();
  });

  it("shows Draft badge when not published", () => {
    const release = makeRelease({ version: "1.0.0" });
    render(<ReleaseItem orgSlug="test-org" release={release} />);
    expect(screen.getByText("Draft")).toBeInTheDocument();
  });

  it("does not show Draft badge when published", () => {
    render(<ReleaseItem {...defaultProps} />);
    expect(screen.queryByText("Draft")).not.toBeInTheDocument();
  });

  it("renders markdown description", () => {
    render(<ReleaseItem {...defaultProps} />);
    expect(screen.getByTestId("markdown-renderer")).toHaveTextContent(
      /Changes.*Fixed bugs/
    );
  });

  it("does not render markdown when no description", () => {
    const release = makeRelease({ publishedAt: 1_700_000_000_000 });
    render(<ReleaseItem orgSlug="test-org" release={release} />);
    expect(screen.queryByTestId("markdown-renderer")).not.toBeInTheDocument();
  });

  it("does not show version badge when no version", () => {
    const release = makeRelease({ publishedAt: 1_700_000_000_000 });
    render(<ReleaseItem orgSlug="test-org" release={release} />);
    const badges = screen.queryAllByTestId("badge");
    const versionBadge = badges.find(
      (b) => b.getAttribute("data-variant") === "outline"
    );
    expect(versionBadge).toBeUndefined();
  });

  it("renders shipped features when feedback is present", () => {
    const release = makeRelease({
      publishedAt: 1_700_000_000_000,
      feedback: [
        { _id: "fb1" as Id<"feedback">, title: "Dark Mode" },
        { _id: "fb2" as Id<"feedback">, title: "Export PDF" },
      ],
    });
    render(<ReleaseItem orgSlug="test-org" release={release} />);
    expect(screen.getByText("Shipped Features")).toBeInTheDocument();
    expect(screen.getByText("Dark Mode")).toBeInTheDocument();
    expect(screen.getByText("Export PDF")).toBeInTheDocument();
  });

  it("filters out null feedback items", () => {
    const release = makeRelease({
      publishedAt: 1_700_000_000_000,
      feedback: [{ _id: "fb1" as Id<"feedback">, title: "Dark Mode" }, null],
    });
    render(<ReleaseItem orgSlug="test-org" release={release} />);
    expect(screen.getByText("Dark Mode")).toBeInTheDocument();
  });

  it("does not show shipped features when feedback array is empty", () => {
    const release = makeRelease({
      publishedAt: 1_700_000_000_000,
      feedback: [],
    });
    render(<ReleaseItem orgSlug="test-org" release={release} />);
    expect(screen.queryByText("Shipped Features")).not.toBeInTheDocument();
  });

  it("does not show admin actions when isAdmin is false", () => {
    render(<ReleaseItem {...defaultProps} />);
    expect(screen.queryByTestId("dropdown")).not.toBeInTheDocument();
    expect(screen.queryByTestId("next-link")).not.toBeInTheDocument();
  });

  it("shows admin actions when isAdmin is true", () => {
    render(<ReleaseItem {...defaultProps} isAdmin />);
    expect(screen.getByTestId("dropdown")).toBeInTheDocument();
    expect(screen.getByTestId("next-link")).toBeInTheDocument();
  });

  it("renders correct edit link", () => {
    render(<ReleaseItem {...defaultProps} isAdmin />);
    const link = screen.getByTestId("next-link");
    expect(link).toHaveAttribute(
      "href",
      "/dashboard/test-org/changelog/release1/edit"
    );
  });

  it("shows Unpublish option for published releases", () => {
    render(<ReleaseItem {...defaultProps} isAdmin />);
    expect(screen.getByText("Unpublish")).toBeInTheDocument();
  });

  it("shows Publish option for draft releases", () => {
    const release = makeRelease({ version: "1.0.0" });
    render(<ReleaseItem isAdmin orgSlug="test-org" release={release} />);
    expect(screen.getByText("Publish")).toBeInTheDocument();
  });

  it("calls onPublish when Publish is clicked", () => {
    const onPublish = vi.fn();
    const release = makeRelease({ version: "1.0.0" });
    render(
      <ReleaseItem
        isAdmin
        onPublish={onPublish}
        orgSlug="test-org"
        release={release}
      />
    );
    fireEvent.click(screen.getByText("Publish"));
    expect(onPublish).toHaveBeenCalledOnce();
  });

  it("calls onUnpublish when Unpublish is clicked", () => {
    const onUnpublish = vi.fn();
    render(<ReleaseItem {...defaultProps} isAdmin onUnpublish={onUnpublish} />);
    fireEvent.click(screen.getByText("Unpublish"));
    expect(onUnpublish).toHaveBeenCalledOnce();
  });

  it("calls onDelete when Delete is clicked", () => {
    const onDelete = vi.fn();
    render(<ReleaseItem {...defaultProps} isAdmin onDelete={onDelete} />);
    fireEvent.click(screen.getByText("Delete"));
    expect(onDelete).toHaveBeenCalledOnce();
  });

  it("applies reduced opacity for draft releases", () => {
    const release = makeRelease({ version: "1.0.0" });
    const { container } = render(
      <ReleaseItem orgSlug="test-org" release={release} />
    );
    const contentDiv = container.querySelector(".opacity-70");
    expect(contentDiv).toBeInTheDocument();
  });
});
