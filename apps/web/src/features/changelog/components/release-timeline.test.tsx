import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("./release-item", () => ({
  ReleaseItem: ({
    release,
    onPublish,
    onUnpublish,
    onDelete,
  }: {
    release: { _id: string; title: string };
    onPublish?: () => void;
    onUnpublish?: () => void;
    onDelete?: () => void;
  }) => (
    <div>
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

const makeRelease = (
  id: string,
  title: string,
  extra: Partial<ReleaseData> = {}
): ReleaseData => ({
  _creationTime: 1_700_000_000_000,
  _id: id as Id<"releases">,
  title,
  ...extra,
});

describe("ReleaseTimeline", () => {
  const defaultProps = {
    orgSlug: "test-org",
    releases: [
      makeRelease("r1", "Release 1", {
        publishedAt: 1_700_000_000_000,
        version: "1.0.0",
      }),
      makeRelease("r2", "Release 2", {
        publishedAt: 1_700_100_000_000,
        version: "2.0.0",
      }),
    ],
  };

  it("shows the public empty state when releases array is empty", () => {
    render(<ReleaseTimeline orgSlug="test-org" releases={[]} />);
    expect(screen.getByText("No releases yet")).toBeInTheDocument();
    expect(
      screen.getByText("Subscribe to hear about the first release.")
    ).toBeInTheDocument();
  });

  it("shows admin empty-state copy to admins", () => {
    render(<ReleaseTimeline isAdmin orgSlug="test-org" releases={[]} />);
    expect(
      screen.getByText("Write your first release to tell users what shipped.")
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Subscribe to hear about the first release.")
    ).not.toBeInTheDocument();
  });

  it("shows a loading state instead of the empty state while releases load", () => {
    render(<ReleaseTimeline orgSlug="test-org" releases={undefined} />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading releases…");
    expect(screen.queryByText("No releases yet")).not.toBeInTheDocument();
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
});
