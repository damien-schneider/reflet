import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { TagCard } from "@/features/tags/components/tag-card";
import { toId } from "@/lib/convex-helpers";

const tag = { _id: toId("tags", "tag1"), color: "red", name: "Bug" };
const actions = { onDelete: vi.fn(), onEdit: vi.fn() };

test("an unconfigured category is displayed as Team", () => {
  render(<TagCard actions={actions} isAdmin={false} tag={tag} />);
  expect(screen.getByText("Bug")).toBeVisible();
  expect(screen.getByText("Team")).toBeVisible();
  expect(
    screen.queryByRole("button", { name: "Actions for Bug" })
  ).not.toBeInTheDocument();
});

test("an explicitly public category displays its audience", () => {
  render(
    <TagCard
      actions={actions}
      isAdmin={false}
      tag={{ ...tag, settings: { isPublic: true } }}
    />
  );
  expect(screen.getByText("Public")).toBeVisible();
});

test("an admin can open the category editor from its menu", async () => {
  const onEdit = vi.fn();
  render(<TagCard actions={{ ...actions, onEdit }} isAdmin tag={tag} />);
  fireEvent.click(screen.getByRole("button", { name: "Actions for Bug" }));
  fireEvent.click(await screen.findByRole("menuitem", { name: "Edit" }));
  expect(onEdit).toHaveBeenCalledOnce();
});

test("an admin can request category deletion from its menu", async () => {
  const onDelete = vi.fn();
  render(<TagCard actions={{ ...actions, onDelete }} isAdmin tag={tag} />);
  fireEvent.click(screen.getByRole("button", { name: "Actions for Bug" }));
  fireEvent.click(await screen.findByRole("menuitem", { name: "Delete" }));
  expect(onDelete).toHaveBeenCalledOnce();
});
