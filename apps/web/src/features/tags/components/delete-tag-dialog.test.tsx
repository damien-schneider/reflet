import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mockDeleteTag = vi.fn();

vi.mock("convex/react", () => ({
  useMutation: () => mockDeleteTag,
}));

vi.mock("@reflet/backend/convex/_generated/api", () => ({
  api: { organizations: { tag_manager_actions: { remove: "remove" } } },
}));

import { DeleteTagDialog } from "./delete-tag-dialog";

const TAG = { _id: "tag1" as Id<"tags">, name: "Bug" };

afterEach(() => {
  vi.clearAllMocks();
});

function renderDialog(tag: typeof TAG | null = TAG) {
  const onOpenChange = vi.fn();
  const onSuccess = vi.fn();
  render(
    <DeleteTagDialog
      onOpenChange={onOpenChange}
      onSuccess={onSuccess}
      tag={tag}
    />
  );
  return { onOpenChange, onSuccess };
}

describe("DeleteTagDialog", () => {
  it("stays closed without a tag", () => {
    renderDialog(null);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("names the tag and the consequence", () => {
    renderDialog();
    expect(
      screen.getByRole("heading", { name: "Delete “Bug”?" })
    ).toBeVisible();
    expect(screen.getByText(/removed from every feedback item/)).toBeVisible();
  });

  it("deletes the tag and reports success", async () => {
    mockDeleteTag.mockResolvedValue(undefined);
    const { onSuccess } = renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "Delete tag" }));

    expect(mockDeleteTag).toHaveBeenCalledWith({ id: "tag1" });
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });

  it("disables both actions while deleting", () => {
    mockDeleteTag.mockReturnValue(Promise.withResolvers<void>().promise);
    renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "Delete tag" }));

    expect(screen.getByRole("button", { name: /Delete tag/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });

  it("shows a recoverable error when deletion fails", async () => {
    mockDeleteTag.mockRejectedValue(new Error("network"));
    const { onSuccess } = renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "Delete tag" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/try again/);
    expect(onSuccess).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Delete tag" })).toBeEnabled();
  });

  it("closes on Cancel", () => {
    const { onOpenChange } = renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
