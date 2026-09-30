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

const ORG_ID = "org1" as Id<"organizations">;

afterEach(() => {
  vi.clearAllMocks();
});

describe("TagFormPopover", () => {
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
        trigger={<button type="button">Bug</button>}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Bug" }));

    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
