/**
 * @vitest-environment jsdom
 */
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(() => vi.fn()),
}));

vi.mock("@/components/ui/context-menu", () => ({
  ContextList: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="context-list">{children}</div>
  ),
  ContextListContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="context-list-content">{children}</div>
  ),
  ContextListItem: ({
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
  ContextListSeparator: () => <hr />,
  ContextListTrigger: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("./auto-tag-button", () => ({
  AutoTagButton: () => <div data-testid="auto-tag-button" />,
}));

vi.mock("@/features/tags/components/delete-tag-dialog", () => ({
  DeleteTagDialog: ({
    tagId,
    onOpenChange,
    onSuccess,
  }: {
    tagId: string | null;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
  }) =>
    tagId ? (
      <div data-testid="delete-tag-dialog">
        <span data-testid="delete-tag-id">{tagId}</span>
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

const organizationId = "org1" as Id<"organizations">;
const tags: Tag[] = [
  { _id: "t1" as Id<"tags">, name: "Bug", color: "red", icon: "🐛" },
  { _id: "t2" as Id<"tags">, name: "Feature", color: "blue" },
  { _id: "t3" as Id<"tags">, name: "UX", color: "green", icon: "✨" },
];

describe("TagFilterBar", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders All button", () => {
    render(
      <TagFilterBar
        isAdmin={false}
        onTagSelect={vi.fn()}
        organizationId={organizationId}
        selectedTagId={null}
        tags={tags}
      />
    );
    expect(screen.getByText("All")).toBeInTheDocument();
  });

  it("renders all tag buttons", () => {
    render(
      <TagFilterBar
        isAdmin={false}
        onTagSelect={vi.fn()}
        organizationId={organizationId}
        selectedTagId={null}
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
        onTagSelect={vi.fn()}
        organizationId={organizationId}
        selectedTagId={null}
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
        onTagSelect={onTagSelect}
        organizationId={organizationId}
        selectedTagId="t1"
        tags={tags}
      />
    );
    await user.click(screen.getByText("All"));
    expect(onTagSelect).toHaveBeenCalledWith(null);
  });

  it("calls onTagSelect with tag id when tag clicked", async () => {
    const user = userEvent.setup();
    const onTagSelect = vi.fn();
    render(
      <TagFilterBar
        isAdmin={false}
        onTagSelect={onTagSelect}
        organizationId={organizationId}
        selectedTagId={null}
        tags={tags}
      />
    );
    await user.click(screen.getByText("Bug"));
    expect(onTagSelect).toHaveBeenCalledWith("t1");
  });

  it("deselects tag when clicking already selected tag", async () => {
    const user = userEvent.setup();
    const onTagSelect = vi.fn();
    render(
      <TagFilterBar
        isAdmin={false}
        onTagSelect={onTagSelect}
        organizationId={organizationId}
        selectedTagId="t1"
        tags={tags}
      />
    );
    await user.click(screen.getByText("Bug"));
    expect(onTagSelect).toHaveBeenCalledWith(null);
  });

  it("shows AutoTagButton for admin", () => {
    render(
      <TagFilterBar
        isAdmin
        onTagSelect={vi.fn()}
        organizationId={organizationId}
        selectedTagId={null}
        tags={tags}
      />
    );
    expect(screen.getByTestId("auto-tag-button")).toBeInTheDocument();
  });

  it("hides AutoTagButton for non-admin", () => {
    render(
      <TagFilterBar
        isAdmin={false}
        onTagSelect={vi.fn()}
        organizationId={organizationId}
        selectedTagId={null}
        tags={tags}
      />
    );
    expect(screen.queryByTestId("auto-tag-button")).not.toBeInTheDocument();
  });

  it("shows add tag popover for admin", () => {
    render(
      <TagFilterBar
        isAdmin
        onTagSelect={vi.fn()}
        organizationId={organizationId}
        selectedTagId={null}
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
        onTagSelect={vi.fn()}
        organizationId={organizationId}
        selectedTagId={null}
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
        onTagSelect={vi.fn()}
        organizationId={organizationId}
        selectedTagId={null}
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
        onTagSelect={vi.fn()}
        organizationId={organizationId}
        selectedTagId={null}
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
        onTagSelect={vi.fn()}
        organizationId={organizationId}
        selectedTagId={null}
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
        onTagSelect={onTagSelect}
        organizationId={organizationId}
        selectedTagId="t1"
        tags={tags}
      />
    );
    const deleteButtons = screen.getAllByText("Delete tag");
    await user.click(deleteButtons[0]);
    await user.click(screen.getByTestId("delete-confirm"));
    expect(onTagSelect).toHaveBeenCalledWith(null);
  });
});
