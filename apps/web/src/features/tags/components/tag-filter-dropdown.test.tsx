import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mockCreate = vi.fn();
const mockUpdate = vi.fn();

vi.mock("convex/react", () => ({
  useMutation: (ref: string) => (ref === "create" ? mockCreate : mockUpdate),
}));

vi.mock("@reflet/backend/convex/_generated/api", () => ({
  api: {
    organizations: {
      tag_manager_actions: {
        create: "create",
        remove: "remove",
        update: "update",
      },
    },
  },
}));

vi.mock("@/components/ui/notion-color-picker", () => ({
  NotionColorPicker: () => null,
}));

vi.stubGlobal(
  "ResizeObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
);
Element.prototype.scrollIntoView = vi.fn();
Element.prototype.getAnimations = () => [];

import { TagFilterDropdown } from "./tag-filter-dropdown";

const ORG_ID = "org1" as Id<"organizations">;
const TAGS = [
  { _id: "tag1" as Id<"tags">, color: "red", name: "Bug" },
  { _id: "tag2" as Id<"tags">, color: "blue", icon: "✨", name: "Feature" },
];

afterEach(() => {
  vi.clearAllMocks();
});

function openDropdown(
  props: Partial<{ isAdmin: boolean; selectedTagIds: string[] }> = {}
) {
  const onTagChange = vi.fn();
  render(
    <TagFilterDropdown
      isAdmin={props.isAdmin ?? false}
      onTagChange={onTagChange}
      organizationId={ORG_ID}
      selectedTagIds={props.selectedTagIds ?? []}
      tags={TAGS}
    />
  );
  fireEvent.click(screen.getByRole("button", { name: /Tags/ }));
  return { onTagChange };
}

const search = (value: string) =>
  fireEvent.change(screen.getByRole("combobox"), { target: { value } });

describe("TagFilterDropdown", () => {
  it("shows the selected count on the trigger", () => {
    openDropdown({ selectedTagIds: ["tag1", "tag2"] });
    expect(screen.getByRole("button", { name: /Tags/ })).toHaveTextContent(
      "Tags2"
    );
  });

  it("toggles a tag on select", () => {
    const { onTagChange } = openDropdown({ selectedTagIds: ["tag1"] });

    fireEvent.click(screen.getByText("Bug"));
    fireEvent.click(screen.getByText("Feature"));

    expect(onTagChange).toHaveBeenNthCalledWith(1, "tag1", false);
    expect(onTagChange).toHaveBeenNthCalledWith(2, "tag2", true);
  });

  it("filters case-insensitively", () => {
    openDropdown();
    search("FEAT");

    expect(screen.getByText("Feature")).toBeInTheDocument();
    expect(screen.queryByText("Bug")).not.toBeInTheDocument();
  });

  it("offers to create a missing tag only to admins", () => {
    openDropdown();
    search("Idea");
    expect(screen.queryByText(/Create “Idea”/)).not.toBeInTheDocument();
    expect(screen.getByText("No tags found.")).toBeInTheDocument();
  });

  it("creates a missing tag for admins and clears the search", async () => {
    mockCreate.mockResolvedValue("tag3");
    openDropdown({ isAdmin: true });

    search("bug");
    expect(screen.queryByText(/Create “bug”/)).not.toBeInTheDocument();

    search("Idea");
    fireEvent.click(screen.getByText("Create “Idea”"));

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Idea", organizationId: ORG_ID })
    );
    await waitFor(() => expect(screen.getByRole("combobox")).toHaveValue(""));
  });

  it("gives admins a labelled edit button per tag", () => {
    openDropdown({ isAdmin: true });
    expect(
      screen.getByRole("button", { name: "Edit Bug" })
    ).toBeInTheDocument();
  });

  it("hides edit buttons from members", () => {
    openDropdown();
    expect(
      screen.queryByRole("button", { name: "Edit Bug" })
    ).not.toBeInTheDocument();
  });

  it("renames a tag from the edit form", async () => {
    mockUpdate.mockResolvedValue(undefined);
    openDropdown({ isAdmin: true });

    fireEvent.click(screen.getByRole("button", { name: "Edit Bug" }));
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Defect" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(mockUpdate).toHaveBeenCalledWith({
        color: "red",
        id: "tag1",
        name: "Defect",
      })
    );
  });

  it("asks for confirmation before deleting from the edit form", () => {
    openDropdown({ isAdmin: true });

    fireEvent.click(screen.getByRole("button", { name: "Edit Bug" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(
      screen.getByRole("heading", { name: "Delete “Bug”?" })
    ).toBeVisible();
  });
});
