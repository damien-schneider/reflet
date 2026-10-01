import { Button } from "@ctrl-ui/react/ui/button";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { toId } from "@/lib/convex-helpers";

const mockCreate = vi.fn();
const mockUpdate = vi.fn();

vi.mock("convex/react", () => ({
  useMutation: (ref: string) => (ref === "create" ? mockCreate : mockUpdate),
}));

vi.mock("@reflet/backend/convex/_generated/api", () => ({
  api: {
    organizations: {
      tag_manager_actions: { create: "create", update: "update" },
    },
  },
}));

vi.mock("@/components/ui/emoji-picker", () => ({
  EmojiPicker: ({ onChange }: { onChange: (icon: string) => void }) => (
    <Button onClick={() => onChange("🐛")} type="button">
      Pick emoji
    </Button>
  ),
}));

vi.mock("@/components/ui/notion-color-picker", () => ({
  NotionColorPicker: ({ onChange }: { onChange: (color: string) => void }) => (
    <Button onClick={() => onChange("green")} type="button">
      Pick green
    </Button>
  ),
}));

import { TagFormDialog } from "./tag-form-dialog";

const ORG_ID = toId("organizations", "org1");
const TAG = {
  _id: toId("tags", "tag1"),
  color: "red",
  icon: "🔥",
  name: "Bug",
};

afterEach(() => {
  vi.clearAllMocks();
});

function renderDialog(editingTag: typeof TAG | null = null) {
  const onOpenChange = vi.fn();
  const onSuccess = vi.fn();
  render(
    <TagFormDialog
      editingTag={editingTag}
      onOpenChange={onOpenChange}
      onSuccess={onSuccess}
      open
      organizationId={ORG_ID}
    />
  );
  return { onOpenChange, onSuccess };
}

const nameInput = () => screen.getByLabelText("Name");

it("creates a tag with the chosen name, emoji and color", async () => {
  mockCreate.mockResolvedValue("tag2");
  const { onSuccess } = renderDialog();

  fireEvent.change(nameInput(), { target: { value: "  Feature  " } });
  fireEvent.click(screen.getByRole("button", { name: "Pick emoji" }));
  fireEvent.click(screen.getByRole("button", { name: "Pick green" }));
  fireEvent.click(screen.getByRole("button", { name: "Create" }));

  await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  expect(mockCreate).toHaveBeenCalledWith({
    color: "green",
    icon: "🐛",
    isPublic: false,
    name: "Feature",
    organizationId: ORG_ID,
  });
});

it("submits with Enter from the name field", async () => {
  mockCreate.mockResolvedValue("tag2");
  renderDialog();

  fireEvent.change(nameInput(), { target: { value: "Idea" } });
  fireEvent.submit(nameInput());

  await waitFor(() => expect(mockCreate).toHaveBeenCalled());
});

it("explains an empty name instead of submitting", () => {
  renderDialog();

  fireEvent.click(screen.getByRole("button", { name: "Create" }));

  expect(screen.getByText("Give the tag a name.")).toBeVisible();
  expect(nameInput()).toHaveAccessibleDescription("Give the tag a name.");
  expect(mockCreate).not.toHaveBeenCalled();
});

it("clears the error once the name is edited", () => {
  renderDialog();
  fireEvent.click(screen.getByRole("button", { name: "Create" }));
  fireEvent.change(nameInput(), { target: { value: "B" } });

  expect(screen.queryByText("Give the tag a name.")).not.toBeInTheDocument();
});

it("keeps the dialog open with an error when saving fails", async () => {
  mockCreate.mockRejectedValue(new Error("network"));
  const { onSuccess } = renderDialog();

  fireEvent.change(nameInput(), { target: { value: "Bug" } });
  fireEvent.click(screen.getByRole("button", { name: "Create" }));

  expect(await screen.findByText(/Couldn’t save the tag/)).toBeVisible();
  expect(onSuccess).not.toHaveBeenCalled();
});

it("disables the form while saving", () => {
  mockCreate.mockReturnValue(Promise.withResolvers<void>().promise);
  renderDialog();

  fireEvent.change(nameInput(), { target: { value: "Bug" } });
  fireEvent.click(screen.getByRole("button", { name: "Create" }));

  expect(screen.getByRole("button", { name: /Create/ })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  expect(nameInput()).toBeDisabled();
  const publicRadio = screen.getByRole("radio", {
    exact: true,
    name: "Public",
  });
  expect(publicRadio).toHaveAttribute("aria-disabled", "true");
  fireEvent.click(publicRadio);
  expect(
    screen.getByRole("radio", { exact: true, name: "Team" })
  ).toBeChecked();
});

it("prefills and updates an existing tag, migrating hex colors", async () => {
  mockUpdate.mockResolvedValue(undefined);
  const { onSuccess } = renderDialog({ ...TAG, color: "#ef4444" });

  expect(screen.getByRole("heading", { name: "Edit tag" })).toBeVisible();
  expect(nameInput()).toHaveValue("Bug");

  fireEvent.change(nameInput(), { target: { value: "Defect" } });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));

  await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  expect(mockUpdate).toHaveBeenCalledWith(
    expect.objectContaining({ icon: "🔥", id: "tag1", name: "Defect" })
  );
  expect(mockUpdate.mock.calls[0][0].color).not.toBe("#ef4444");
});

it("closes on Cancel", () => {
  const { onOpenChange } = renderDialog();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(onOpenChange).toHaveBeenCalledWith(false);
});
