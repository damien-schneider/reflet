import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@ctrl-ui/react/ui/badge", () => ({
  Badge: ({
    children,
    variant,
  }: {
    children: React.ReactNode;
    variant?: string;
  }) => <span data-variant={variant}>{children}</span>,
}));

import { SyncedReleasesSection } from "./synced-releases-card";

describe("SyncedReleasesSection", () => {
  it("tells the user how to get releases when none are synced", () => {
    render(<SyncedReleasesSection releases={[]} />);
    expect(screen.getByText(/No releases synced yet/)).toBeInTheDocument();
  });

  it("renders release content", () => {
    const releases = [
      {
        _id: "r1",
        isDraft: false,
        isPrerelease: false,
        name: "Release 1.0",
        tagName: "v1.0.0",
      },
    ];
    render(<SyncedReleasesSection releases={releases} />);
    expect(screen.getByText("Release 1.0")).toBeInTheDocument();
    expect(screen.getByText("v1.0.0")).toBeInTheDocument();
  });

  it("uses tagName when name is not provided", () => {
    const releases = [
      {
        _id: "r1",
        isDraft: false,
        isPrerelease: false,
        tagName: "v3.0.0",
      },
    ];
    render(<SyncedReleasesSection releases={releases} />);
    expect(screen.getAllByText("v3.0.0")).toHaveLength(2);
  });

  it("shows Draft badge for draft releases", () => {
    const releases = [
      {
        _id: "r1",
        isDraft: true,
        isPrerelease: false,
        tagName: "v1.0.0-draft",
      },
    ];
    render(<SyncedReleasesSection releases={releases} />);
    expect(screen.getByText("Draft")).toBeInTheDocument();
  });

  it("shows Pre-release badge for pre-releases", () => {
    const releases = [
      {
        _id: "r1",
        isDraft: false,
        isPrerelease: true,
        tagName: "v1.0.0-rc.1",
      },
    ];
    render(<SyncedReleasesSection releases={releases} />);
    expect(screen.getByText("Pre-release")).toBeInTheDocument();
  });

  it("shows Imported badge when refletReleaseId exists", () => {
    const releases = [
      {
        _id: "r1",
        isDraft: false,
        isPrerelease: false,
        refletReleaseId: "rel_123",
        tagName: "v1.0.0",
      },
    ];
    render(<SyncedReleasesSection releases={releases} />);
    expect(screen.getByText("Imported")).toBeInTheDocument();
  });

  it("limits to 5 releases displayed", () => {
    const releases = Array.from({ length: 8 }, (_, i) => ({
      _id: `r${i}`,
      isDraft: false,
      isPrerelease: false,
      name: `Release ${i}`,
      tagName: `v${i}.0.0`,
    }));
    render(<SyncedReleasesSection releases={releases} />);
    expect(screen.getByText("Release 0")).toBeInTheDocument();
    expect(screen.getByText("Release 4")).toBeInTheDocument();
    expect(screen.queryByText("Release 5")).toBeNull();
  });

  it("does not show Imported badge when no refletReleaseId", () => {
    const releases = [
      { _id: "r1", isDraft: false, isPrerelease: false, tagName: "v1.0.0" },
    ];
    render(<SyncedReleasesSection releases={releases} />);
    expect(screen.queryByText("Imported")).not.toBeInTheDocument();
  });

  it("does not show Draft badge for non-draft release", () => {
    const releases = [
      { _id: "r1", isDraft: false, isPrerelease: false, tagName: "v1.0.0" },
    ];
    render(<SyncedReleasesSection releases={releases} />);
    expect(screen.queryByText("Draft")).not.toBeInTheDocument();
  });

  it("does not show Pre-release badge for stable release", () => {
    const releases = [
      { _id: "r1", isDraft: false, isPrerelease: false, tagName: "v1.0.0" },
    ];
    render(<SyncedReleasesSection releases={releases} />);
    expect(screen.queryByText("Pre-release")).not.toBeInTheDocument();
  });
});
