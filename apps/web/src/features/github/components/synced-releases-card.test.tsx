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

vi.mock("@/components/ui/typography", () => ({
  H3: ({
    children,
    variant,
    className,
  }: {
    children: React.ReactNode;
    variant?: string;
    className?: string;
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
  Text: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <span className={className}>{children}</span>,
}));

import { SyncedReleasesSection } from "./synced-releases-card";

afterEach(cleanup);

describe("SyncedReleasesSection", () => {
  it("returns null for empty releases", () => {
    const { container } = render(<SyncedReleasesSection releases={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders release content", () => {
    const releases = [
      {
        _id: "r1",
        tagName: "v1.0.0",
        name: "Release 1.0",
        isDraft: false,
        isPrerelease: false,
      },
    ];
    render(<SyncedReleasesSection releases={releases} />);
    expect(screen.getByText("Release 1.0")).toBeInTheDocument();
    expect(screen.getByText("v1.0.0")).toBeInTheDocument();
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
    render(<SyncedReleasesSection releases={releases} />);
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
    render(<SyncedReleasesSection releases={releases} />);
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
    render(<SyncedReleasesSection releases={releases} />);
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
    render(<SyncedReleasesSection releases={releases} />);
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
    render(<SyncedReleasesSection releases={releases} />);
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
    render(<SyncedReleasesSection releases={releases} />);
    // Only 5 shown, with "+3 more" indicator
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
    render(<SyncedReleasesSection releases={releases} />);
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
    render(<SyncedReleasesSection releases={releases} />);
    expect(screen.getByText("R1")).toBeInTheDocument();
    expect(screen.getByText("R2")).toBeInTheDocument();
  });

  it("shows all releases when 3 or fewer", () => {
    const releases = Array.from({ length: 3 }, (_, i) => ({
      _id: `r${i}`,
      tagName: `v${i}.0.0`,
      name: `Release ${i}`,
      isDraft: false,
      isPrerelease: false,
    }));
    render(<SyncedReleasesSection releases={releases} />);
    expect(screen.getByText("Release 0")).toBeInTheDocument();
    expect(screen.getByText("Release 1")).toBeInTheDocument();
    expect(screen.getByText("Release 2")).toBeInTheDocument();
  });

  it("does not show Imported badge when no refletReleaseId", () => {
    const releases = [
      { _id: "r1", tagName: "v1.0.0", isDraft: false, isPrerelease: false },
    ];
    render(<SyncedReleasesSection releases={releases} />);
    expect(screen.queryByText("Imported")).not.toBeInTheDocument();
  });

  it("does not show Draft badge for non-draft release", () => {
    const releases = [
      { _id: "r1", tagName: "v1.0.0", isDraft: false, isPrerelease: false },
    ];
    render(<SyncedReleasesSection releases={releases} />);
    expect(screen.queryByText("Draft")).not.toBeInTheDocument();
  });

  it("does not show Pre-release badge for stable release", () => {
    const releases = [
      { _id: "r1", tagName: "v1.0.0", isDraft: false, isPrerelease: false },
    ];
    render(<SyncedReleasesSection releases={releases} />);
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
    render(<SyncedReleasesSection releases={releases} />);
    expect(screen.getByText("Release 0")).toBeInTheDocument();
    expect(screen.getByText("Release 4")).toBeInTheDocument();
    expect(screen.queryByText("Release 5")).toBeNull();
    expect(screen.queryByText("Release 6")).toBeNull();
  });
});
