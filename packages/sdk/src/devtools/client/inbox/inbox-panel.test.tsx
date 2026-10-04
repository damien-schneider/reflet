import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { InboxPanel } from "./inbox-panel";

const { fetchBoardFeedback } = vi.hoisted(() => ({
  fetchBoardFeedback: vi.fn(),
}));
vi.mock("../route/dev-route", () => ({ fetchBoardFeedback }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const boardItem = {
  commentCount: 0,
  createdAt: 0,
  description: "",
  hasVoted: false,
  id: "feedback_1",
  isPinned: false,
  organizationStatus: null,
  status: "open",
  tags: [],
  title: "Filed from another tenant's dashboard",
  updatedAt: 0,
  voteCount: 0,
};

it("reaches the whole board when nothing points at the current page", async () => {
  fetchBoardFeedback.mockImplementation((pagePath: string | null) =>
    Promise.resolve(
      pagePath === null
        ? { hasMore: false, items: [boardItem], total: 1 }
        : { hasMore: false, items: [], total: 0 }
    )
  );
  render(<InboxPanel onOpenCode={vi.fn()} onShowSelector={() => false} />);

  await screen.findByText("Nothing on the board points at this page yet.");
  fireEvent.click(screen.getByRole("button", { name: "Show the whole board" }));

  await screen.findByText(boardItem.title);
  expect(screen.getByText("1 on the board")).toBeTruthy();
  expect(fetchBoardFeedback).toHaveBeenLastCalledWith(null);
  expect(
    screen
      .getByRole("button", { name: "Whole board" })
      .getAttribute("aria-pressed")
  ).toBe("true");
});
