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
  EmojiPicker: () => null,
}));

vi.mock("@/components/ui/notion-color-picker", () => ({
  NotionColorPicker: () => null,
}));

import { TagFormPopover } from "./tag-form-popover";

const ORG_ID = toId("organizations", "org1");

afterEach(() => {
  vi.clearAllMocks();
});

it("opens from the labelled create button", () => {
  const onOpenChange = vi.fn();
  render(
    <TagFormPopover
      onOpenChange={onOpenChange}
      onSuccess={vi.fn()}
      open={false}
      organizationId={ORG_ID}
    />
  );

  fireEvent.click(screen.getByRole("button", { name: "Create tag" }));

  expect(onOpenChange).toHaveBeenCalledWith(true, expect.anything());
});

it("creates a tag from the open popover", async () => {
  mockCreate.mockResolvedValue("tag1");
  const onSuccess = vi.fn();
  render(
    <TagFormPopover
      onOpenChange={vi.fn()}
      onSuccess={onSuccess}
      open
      organizationId={ORG_ID}
    />
  );

  fireEvent.change(screen.getByLabelText("Name"), {
    target: { value: "Bug" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Create" }));

  await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  expect(mockCreate).toHaveBeenCalledWith(
    expect.objectContaining({ name: "Bug", organizationId: ORG_ID })
  );
});

it("does not open when an externally controlled trigger is clicked", () => {
  const onOpenChange = vi.fn();
  render(
    <TagFormPopover
      disableTriggerClick
      onOpenChange={onOpenChange}
      onSuccess={vi.fn()}
      open={false}
      organizationId={ORG_ID}
      trigger={<Button>Bug</Button>}
    />
  );

  fireEvent.click(screen.getByRole("button", { name: "Bug" }));

  expect(onOpenChange).not.toHaveBeenCalled();
});

it("creates a public category only after choosing its public audience", async () => {
  mockCreate.mockResolvedValue("tag1");
  render(
    <TagFormPopover
      onOpenChange={vi.fn()}
      onSuccess={vi.fn()}
      open
      organizationId={ORG_ID}
    />
  );
  expect(
    screen.getByRole("radio", { exact: true, name: "Team" })
  ).toBeChecked();
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Bug" } });
  fireEvent.click(screen.getByRole("radio", { exact: true, name: "Public" }));
  fireEvent.click(screen.getByRole("button", { exact: true, name: "Create" }));
  await waitFor(() =>
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ isPublic: true, name: "Bug" })
    )
  );
});

it("retains a public category's audience while editing its name", async () => {
  mockUpdate.mockResolvedValue("tag1");
  render(
    <TagFormPopover
      editingTag={{
        _id: toId("tags", "tag1"),
        color: "red",
        name: "Bug",
        settings: { isPublic: true },
      }}
      onOpenChange={vi.fn()}
      onSuccess={vi.fn()}
      open
      organizationId={ORG_ID}
    />
  );
  expect(
    screen.getByRole("radio", { exact: true, name: "Public" })
  ).toBeChecked();
  fireEvent.change(screen.getByLabelText("Name"), {
    target: { value: "Updated Bug" },
  });
  fireEvent.click(screen.getByRole("button", { exact: true, name: "Save" }));
  await waitFor(() =>
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ isPublic: true, name: "Updated Bug" })
    )
  );
});
