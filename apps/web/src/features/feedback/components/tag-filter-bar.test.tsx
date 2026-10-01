/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { toId } from "@/lib/convex-helpers";

vi.mock("convex/react", () => ({
  useMutation: vi.fn(() => vi.fn()),
  useQuery: vi.fn(),
}));

vi.mock("@ctrl-ui/react/ui/context-menu", () => ({
  ContextMenu: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="context-list">{children}</div>
  ),
  ContextMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="context-list-content">{children}</div>
  ),
  ContextMenuItem: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => (
    <button data-testid="context-list-item" onClick={onClick} type="button">
      {children}
    </button>
  ),
  ContextMenuSeparator: () => <hr />,
  ContextMenuTrigger: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("./triage-pulse", () => ({
  TriagePulse: () => <div data-testid="triage-pulse" />,
}));

vi.mock("@/features/tags/components/delete-tag-dialog", () => ({
  DeleteTagDialog: ({
    tag,
    onOpenChange,
    onSuccess,
  }: {
    tag: { _id: string } | null;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
  }) =>
    tag ? (
      <div data-testid="delete-tag-dialog">
        <span data-testid="delete-tag-id">{tag._id}</span>
        <button data-testid="delete-confirm" onClick={onSuccess} type="button">
          Confirm Delete
        </button>
        <button
          data-testid="delete-cancel"
          onClick={() => onOpenChange(false)}
          type="button"
        >
          Cancel
        </button>
      </div>
    ) : null,
}));

vi.mock("@/features/tags/components/tag-form-popover", () => ({
  TagFormPopover: ({ trigger }: { trigger?: React.ReactNode }) => (
    <div data-testid="tag-form-popover">{trigger}</div>
  ),
}));

import type { Tag } from "./tag-filter-bar";
import { TagFilterBar } from "./tag-filter-bar";

const organizationId = toId("organizations", "org1");
const tags: Tag[] = [
  { _id: toId("tags", "t1"), color: "red", icon: "🐛", name: "Bug" },
  { _id: toId("tags", "t2"), color: "blue", name: "Feature" },
  { _id: toId("tags", "t3"), color: "green", icon: "✨", name: "UX" },
];

describe("TagFilterBar", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders All button", () => {
    render(
      <TagFilterBar
        isAdmin={false}
        onClearTags={vi.fn()}
        onTagChange={vi.fn()}
        organizationId={organizationId}
        selectedTagIds={[]}
        tags={tags}
      />
    );
    expect(screen.getByText("All")).toBeInTheDocument();
  });

  it("renders all tag buttons", () => {
    render(
      <TagFilterBar
        isAdmin={false}
        onClearTags={vi.fn()}
        onTagChange={vi.fn()}
        organizationId={organizationId}
        selectedTagIds={[]}
        tags={tags}
      />
    );
    expect(screen.getByText("Bug")).toBeInTheDocument();
    expect(screen.getByText("Feature")).toBeInTheDocument();
    expect(screen.getByText("UX")).toBeInTheDocument();
  });

  it("renders tag icons", () => {
    render(
      <TagFilterBar
        isAdmin={false}
        onClearTags={vi.fn()}
        onTagChange={vi.fn()}
        organizationId={organizationId}
        selectedTagIds={[]}
        tags={tags}
      />
    );
    expect(screen.getByText("🐛")).toBeInTheDocument();
    expect(screen.getByText("✨")).toBeInTheDocument();
  });

  it("calls onTagSelect with null when All clicked", async () => {
    const user = userEvent.setup();
    const onTagSelect = vi.fn();
    render(
      <TagFilterBar
        isAdmin={false}
        onClearTags={() => onTagSelect()}
        onTagChange={onTagSelect}
        organizationId={organizationId}
        selectedTagIds={["t1"]}
        tags={tags}
      />
    );
    await user.click(screen.getByText("All"));
    expect(onTagSelect).toHaveBeenCalledWith();
  });

  it("calls onTagSelect with tag id when tag clicked", async () => {
    const user = userEvent.setup();
    const onTagSelect = vi.fn();
    render(
      <TagFilterBar
        isAdmin={false}
        onClearTags={() => onTagSelect()}
        onTagChange={onTagSelect}
        organizationId={organizationId}
        selectedTagIds={[]}
        tags={tags}
      />
    );
    await user.click(screen.getByText("Bug"));
    expect(onTagSelect).toHaveBeenCalledWith("t1", true);
  });

  it("deselects tag when clicking already selected tag", async () => {
    const user = userEvent.setup();
    const onTagSelect = vi.fn();
    render(
      <TagFilterBar
        isAdmin={false}
        onClearTags={() => onTagSelect()}
        onTagChange={onTagSelect}
        organizationId={organizationId}
        selectedTagIds={["t1"]}
        tags={tags}
      />
    );
    await user.click(screen.getByText("Bug"));
    expect(onTagSelect).toHaveBeenCalledWith("t1", false);
  });

  it("shows TriagePulse for admin", () => {
    render(
      <TagFilterBar
        isAdmin
        onClearTags={vi.fn()}
        onTagChange={vi.fn()}
        organizationId={organizationId}
        selectedTagIds={[]}
        tags={tags}
      />
    );
    expect(screen.getByTestId("triage-pulse")).toBeInTheDocument();
  });

  it("hides TriagePulse for non-admin", () => {
    render(
      <TagFilterBar
        isAdmin={false}
        onClearTags={vi.fn()}
        onTagChange={vi.fn()}
        organizationId={organizationId}
        selectedTagIds={[]}
        tags={tags}
      />
    );
    expect(screen.queryByTestId("triage-pulse")).not.toBeInTheDocument();
  });

  it("shows add tag popover for admin", () => {
    render(
      <TagFilterBar
        isAdmin
        onClearTags={vi.fn()}
        onTagChange={vi.fn()}
        organizationId={organizationId}
        selectedTagIds={[]}
        tags={tags}
      />
    );
    const popovers = screen.getAllByTestId("tag-form-popover");
    expect(popovers.length).toBeGreaterThan(0);
  });

  it("renders empty tag list", () => {
    render(
      <TagFilterBar
        isAdmin={false}
        onClearTags={vi.fn()}
        onTagChange={vi.fn()}
        organizationId={organizationId}
        selectedTagIds={[]}
        tags={[]}
      />
    );
    expect(screen.getByText("All")).toBeInTheDocument();
    expect(screen.queryByText("Bug")).not.toBeInTheDocument();
  });

  it("renders context menu items for admin tags", () => {
    render(
      <TagFilterBar
        isAdmin
        onClearTags={vi.fn()}
        onTagChange={vi.fn()}
        organizationId={organizationId}
        selectedTagIds={[]}
        tags={tags}
      />
    );
    const editItems = screen.getAllByText("Edit tag");
    expect(editItems.length).toBe(tags.length);
    const deleteItems = screen.getAllByText("Delete tag");
    expect(deleteItems.length).toBe(tags.length);
  });

  it("does not render context menu for non-admin tags", () => {
    render(
      <TagFilterBar
        isAdmin={false}
        onClearTags={vi.fn()}
        onTagChange={vi.fn()}
        organizationId={organizationId}
        selectedTagIds={[]}
        tags={tags}
      />
    );
    expect(screen.queryByTestId("context-list")).not.toBeInTheDocument();
  });

  it("opens delete dialog when Delete tag context item is clicked", async () => {
    const user = userEvent.setup();
    render(
      <TagFilterBar
        isAdmin
        onClearTags={vi.fn()}
        onTagChange={vi.fn()}
        organizationId={organizationId}
        selectedTagIds={[]}
        tags={tags}
      />
    );
    const deleteButtons = screen.getAllByText("Delete tag");
    await user.click(deleteButtons[0]);
    expect(screen.getByTestId("delete-tag-dialog")).toBeInTheDocument();
    expect(screen.getByTestId("delete-tag-id")).toHaveTextContent("t1");
  });

  it("clears selected tag when deleted tag was selected", async () => {
    const user = userEvent.setup();
    const onTagSelect = vi.fn();
    render(
      <TagFilterBar
        isAdmin
        onClearTags={() => onTagSelect()}
        onTagChange={onTagSelect}
        organizationId={organizationId}
        selectedTagIds={["t1"]}
        tags={tags}
      />
    );
    const deleteButtons = screen.getAllByText("Delete tag");
    await user.click(deleteButtons[0]);
    await user.click(screen.getByTestId("delete-confirm"));
    expect(onTagSelect).toHaveBeenCalledWith("t1", false);
  });
});
