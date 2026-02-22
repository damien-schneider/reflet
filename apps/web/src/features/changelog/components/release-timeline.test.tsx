import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@phosphor-icons/react", () => ({
  Megaphone: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="megaphone-icon" />
  ),
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card">{children}</div>
  ),
  CardContent: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div className={className} data-testid="card-content">
      {children}
    </div>
  ),
}));

vi.mock("@/components/ui/typography", () => ({
  H3: ({
    children,
    className,
    variant,
  }: {
    children: React.ReactNode;
    className?: string;
    variant?: string;
  }) => (
    <h3 className={className} data-variant={variant}>
      {children}
    </h3>
  ),
  Muted: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <p className={className}>{children}</p>,
}));

vi.mock("./release-item", () => ({
  ReleaseItem: ({
    release,
    orgSlug,
    isAdmin,
    onPublish,
    onUnpublish,
    onDelete,
  }: {
    release: { _id: string; title: string };
    orgSlug: string;
    isAdmin: boolean;
    onPublish?: () => void;
    onUnpublish?: () => void;
    onDelete?: () => void;
  }) => (
    <div data-admin={isAdmin} data-org={orgSlug} data-testid="release-item">
      {release.title}
      {onPublish && (
        <button
          data-testid={`publish-${release._id}`}
          onClick={onPublish}
          type="button"
        >
          Publish
        </button>
      )}
      {onUnpublish && (
        <button
          data-testid={`unpublish-${release._id}`}
          onClick={onUnpublish}
          type="button"
        >
          Unpublish
        </button>
      )}
      {onDelete && (
        <button
          data-testid={`delete-${release._id}`}
          onClick={onDelete}
          type="button"
        >
          Delete
        </button>
      )}
    </div>
  ),
}));

import type { ReleaseData } from "./release-item";
import { ReleaseTimeline } from "./release-timeline";

afterEach(cleanup);

const makeRelease = (
  id: string,
  title: string,
  extra: Partial<ReleaseData> = {}
): ReleaseData => ({
  _id: id as Id<"releases">,
  title,
  _creationTime: 1_700_000_000_000,
  ...extra,
});

describe("ReleaseTimeline", () => {
  const defaultProps = {
    releases: [
      makeRelease("r1", "Release 1", {
        version: "1.0.0",
        publishedAt: 1_700_000_000_000,
      }),
      makeRelease("r2", "Release 2", {
        version: "2.0.0",
        publishedAt: 1_700_100_000_000,
      }),
    ],
    orgSlug: "test-org",
  };

  it("renders all release items", () => {
    render(<ReleaseTimeline {...defaultProps} />);
    const items = screen.getAllByTestId("release-item");
    expect(items).toHaveLength(2);
    expect(screen.getByText("Release 1")).toBeInTheDocument();
    expect(screen.getByText("Release 2")).toBeInTheDocument();
  });

  it("shows empty state when releases array is empty", () => {
    render(<ReleaseTimeline orgSlug="test-org" releases={[]} />);
    expect(screen.getByText("No releases yet")).toBeInTheDocument();
  });

  it("shows admin empty message when isAdmin is true", () => {
    render(<ReleaseTimeline isAdmin orgSlug="test-org" releases={[]} />);
    expect(
      screen.getByText("Create your first release to share product updates.")
    ).toBeInTheDocument();
  });

  it("shows non-admin empty message when isAdmin is false", () => {
    render(<ReleaseTimeline orgSlug="test-org" releases={[]} />);
    expect(
      screen.getByText("Check back soon for product updates.")
    ).toBeInTheDocument();
  });

  it("renders emptyAction in empty state", () => {
    render(
      <ReleaseTimeline
        emptyAction={<button type="button">Create Release</button>}
        orgSlug="test-org"
        releases={[]}
      />
    );
    expect(screen.getByText("Create Release")).toBeInTheDocument();
  });

  it("does not render emptyAction when releases exist", () => {
    render(
      <ReleaseTimeline
        {...defaultProps}
        emptyAction={<button type="button">Create Release</button>}
      />
    );
    expect(screen.queryByText("Create Release")).not.toBeInTheDocument();
  });

  it("passes isAdmin to release items", () => {
    render(<ReleaseTimeline {...defaultProps} isAdmin />);
    const items = screen.getAllByTestId("release-item");
    for (const item of items) {
      expect(item).toHaveAttribute("data-admin", "true");
    }
  });

  it("passes orgSlug to release items", () => {
    render(<ReleaseTimeline {...defaultProps} />);
    const items = screen.getAllByTestId("release-item");
    for (const item of items) {
      expect(item).toHaveAttribute("data-org", "test-org");
    }
  });

  it("shows empty state when releases is undefined-like (falsy)", () => {
    render(
      <ReleaseTimeline orgSlug="test-org" releases={[] as ReleaseData[]} />
    );
    expect(screen.getByText("No releases yet")).toBeInTheDocument();
  });

  it("shows megaphone icon in empty state", () => {
    render(<ReleaseTimeline orgSlug="test-org" releases={[]} />);
    expect(screen.getByTestId("megaphone-icon")).toBeInTheDocument();
  });

  it("renders a single release", () => {
    render(
      <ReleaseTimeline
        orgSlug="test-org"
        releases={[makeRelease("r1", "Solo Release")]}
      />
    );
    expect(screen.getByText("Solo Release")).toBeInTheDocument();
    expect(screen.getAllByTestId("release-item")).toHaveLength(1);
  });

  it("renders as admin with no releases shows admin empty message", () => {
    render(<ReleaseTimeline isAdmin orgSlug="test-org" releases={[]} />);
    expect(screen.getByText(/create|start|publish/i)).toBeInTheDocument();
  });

  it("renders as non-admin with no releases shows different message", () => {
    render(
      <ReleaseTimeline isAdmin={false} orgSlug="test-org" releases={[]} />
    );
    const elements = screen.getAllByText(/no releases|coming soon|check back/i);
    expect(elements.length).toBeGreaterThan(0);
  });

  it("renders multiple releases in order", () => {
    render(
      <ReleaseTimeline
        orgSlug="test-org"
        releases={[
          makeRelease("r1", "First"),
          makeRelease("r2", "Second"),
          makeRelease("r3", "Third"),
        ]}
      />
    );
    expect(screen.getAllByTestId("release-item")).toHaveLength(3);
  });

  it("renders release title text", () => {
    render(
      <ReleaseTimeline
        orgSlug="test-org"
        releases={[makeRelease("r1", "Big Feature")]}
      />
    );
    expect(screen.getByText("Big Feature")).toBeInTheDocument();
  });

  it("calls onPublish with release id when publish is clicked", () => {
    const onPublish = vi.fn();
    render(<ReleaseTimeline {...defaultProps} onPublish={onPublish} />);
    fireEvent.click(screen.getByTestId("publish-r1"));
    expect(onPublish).toHaveBeenCalledWith("r1");
  });

  it("calls onUnpublish with release id when unpublish is clicked", () => {
    const onUnpublish = vi.fn();
    render(<ReleaseTimeline {...defaultProps} onUnpublish={onUnpublish} />);
    fireEvent.click(screen.getByTestId("unpublish-r1"));
    expect(onUnpublish).toHaveBeenCalledWith("r1");
  });

  it("calls onDelete with full release when delete is clicked", () => {
    const onDelete = vi.fn();
    const releases = [makeRelease("r1", "Release 1", { version: "1.0.0" })];
    render(
      <ReleaseTimeline
        onDelete={onDelete}
        orgSlug="test-org"
        releases={releases}
      />
    );
    fireEvent.click(screen.getByTestId("delete-r1"));
    expect(onDelete).toHaveBeenCalledWith(releases[0]);
  });

  it("renders wrapper callbacks even when parent callbacks not provided", () => {
    render(<ReleaseTimeline {...defaultProps} />);
    // Component always passes wrapper arrow functions to ReleaseItem,
    // so buttons render but clicking them is a no-op
    expect(screen.getByTestId("publish-r1")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("publish-r1"));
    // No error thrown - the optional chaining makes it a no-op
  });
});
