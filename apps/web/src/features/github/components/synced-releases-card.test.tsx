import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/badge", () => ({
  Badge: ({
    children,
    variant,
  }: {
    children: React.ReactNode;
    variant?: string;
  }) => <span data-variant={variant}>{children}</span>,
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CardDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
  CardHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CardTitle: ({ children }: { children: React.ReactNode }) => (
    <h3>{children}</h3>
  ),
}));

vi.mock("@/components/ui/typography", () => ({
  Text: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <span className={className}>{children}</span>,
}));

import { SyncedReleasesCard } from "./synced-releases-card";

afterEach(cleanup);

describe("SyncedReleasesCard", () => {
  it("returns null for empty releases", () => {
    const { container } = render(<SyncedReleasesCard releases={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders title and count", () => {
    const releases = [
      {
        _id: "r1",
        tagName: "v1.0.0",
        name: "Release 1.0",
        isDraft: false,
        isPrerelease: false,
      },
    ];
    render(<SyncedReleasesCard releases={releases} />);
    expect(screen.getByText("Synced Releases")).toBeInTheDocument();
    expect(
      screen.getByText("1 releases synced from GitHub")
    ).toBeInTheDocument();
  });

  it("renders release name and tag", () => {
    const releases = [
      {
        _id: "r1",
        tagName: "v2.0.0",
        name: "Version 2.0",
        isDraft: false,
        isPrerelease: false,
      },
    ];
    render(<SyncedReleasesCard releases={releases} />);
    expect(screen.getByText("Version 2.0")).toBeInTheDocument();
    expect(screen.getByText("v2.0.0")).toBeInTheDocument();
  });

  it("uses tagName when name is not provided", () => {
    const releases = [
      {
        _id: "r1",
        tagName: "v3.0.0",
        isDraft: false,
        isPrerelease: false,
      },
    ];
    render(<SyncedReleasesCard releases={releases} />);
    // tagName appears both as primary name and as secondary
    const tags = screen.getAllByText("v3.0.0");
    expect(tags.length).toBeGreaterThanOrEqual(1);
  });

  it("shows Draft badge for draft releases", () => {
    const releases = [
      {
        _id: "r1",
        tagName: "v1.0.0-draft",
        isDraft: true,
        isPrerelease: false,
      },
    ];
    render(<SyncedReleasesCard releases={releases} />);
    expect(screen.getByText("Draft")).toBeInTheDocument();
  });

  it("shows Pre-release badge for pre-releases", () => {
    const releases = [
      {
        _id: "r1",
        tagName: "v1.0.0-rc.1",
        isDraft: false,
        isPrerelease: true,
      },
    ];
    render(<SyncedReleasesCard releases={releases} />);
    expect(screen.getByText("Pre-release")).toBeInTheDocument();
  });

  it("shows Imported badge when refletReleaseId exists", () => {
    const releases = [
      {
        _id: "r1",
        tagName: "v1.0.0",
        isDraft: false,
        isPrerelease: false,
        refletReleaseId: "rel_123",
      },
    ];
    render(<SyncedReleasesCard releases={releases} />);
    expect(screen.getByText("Imported")).toBeInTheDocument();
  });

  it("limits to 5 releases displayed", () => {
    const releases = Array.from({ length: 8 }, (_, i) => ({
      _id: `r${i}`,
      tagName: `v${i}.0.0`,
      name: `Release ${i}`,
      isDraft: false,
      isPrerelease: false,
    }));
    render(<SyncedReleasesCard releases={releases} />);
    expect(
      screen.getByText("8 releases synced from GitHub")
    ).toBeInTheDocument();
    // Only 5 shown
    expect(screen.getByText("Release 0")).toBeInTheDocument();
    expect(screen.getByText("Release 4")).toBeInTheDocument();
    expect(screen.queryByText("Release 5")).toBeNull();
  });

  it("can show all badges on one release", () => {
    const releases = [
      {
        _id: "r1",
        tagName: "v0.1.0",
        isDraft: true,
        isPrerelease: true,
        refletReleaseId: "rel_1",
      },
    ];
    render(<SyncedReleasesCard releases={releases} />);
    expect(screen.getByText("Draft")).toBeInTheDocument();
    expect(screen.getByText("Pre-release")).toBeInTheDocument();
    expect(screen.getByText("Imported")).toBeInTheDocument();
  });

  it("renders multiple releases", () => {
    const releases = [
      {
        _id: "r1",
        tagName: "v1.0.0",
        name: "R1",
        isDraft: false,
        isPrerelease: false,
      },
      {
        _id: "r2",
        tagName: "v2.0.0",
        name: "R2",
        isDraft: false,
        isPrerelease: false,
      },
    ];
    render(<SyncedReleasesCard releases={releases} />);
    expect(screen.getByText("R1")).toBeInTheDocument();
    expect(screen.getByText("R2")).toBeInTheDocument();
  });

  it("shows correct count for 3 releases", () => {
    const releases = Array.from({ length: 3 }, (_, i) => ({
      _id: `r${i}`,
      tagName: `v${i}.0.0`,
      name: `Release ${i}`,
      isDraft: false,
      isPrerelease: false,
    }));
    render(<SyncedReleasesCard releases={releases} />);
    expect(
      screen.getByText("3 releases synced from GitHub")
    ).toBeInTheDocument();
  });

  it("does not show Imported badge when no refletReleaseId", () => {
    const releases = [
      { _id: "r1", tagName: "v1.0.0", isDraft: false, isPrerelease: false },
    ];
    render(<SyncedReleasesCard releases={releases} />);
    expect(screen.queryByText("Imported")).not.toBeInTheDocument();
  });

  it("does not show Draft badge for non-draft release", () => {
    const releases = [
      { _id: "r1", tagName: "v1.0.0", isDraft: false, isPrerelease: false },
    ];
    render(<SyncedReleasesCard releases={releases} />);
    expect(screen.queryByText("Draft")).not.toBeInTheDocument();
  });

  it("does not show Pre-release badge for stable release", () => {
    const releases = [
      { _id: "r1", tagName: "v1.0.0", isDraft: false, isPrerelease: false },
    ];
    render(<SyncedReleasesCard releases={releases} />);
    expect(screen.queryByText("Pre-release")).not.toBeInTheDocument();
  });

  it("renders exactly 5 releases when given more", () => {
    const releases = Array.from({ length: 7 }, (_, i) => ({
      _id: `r${i}`,
      tagName: `v${i}.0.0`,
      name: `Release ${i}`,
      isDraft: false,
      isPrerelease: false,
    }));
    render(<SyncedReleasesCard releases={releases} />);
    expect(screen.getByText("Release 0")).toBeInTheDocument();
    expect(screen.getByText("Release 4")).toBeInTheDocument();
    expect(screen.queryByText("Release 5")).toBeNull();
    expect(screen.queryByText("Release 6")).toBeNull();
  });
});
