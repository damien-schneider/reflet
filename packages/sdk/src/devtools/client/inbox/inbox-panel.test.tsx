import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { BoardCall } from "../route/dev-route";
import { InboxPanel } from "./inbox-panel";

const fetchBoardFeedback = vi.fn();
const boardCall: BoardCall = (_apiPath, init) =>
  fetchBoardFeedback(init?.query?.pagePath ?? null);

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
  render(<InboxPanel boardCall={boardCall} onShowSelector={() => false} />);

  await screen.findByText("Nothing on the board points at this page yet.");
  fireEvent.click(screen.getByRole("button", { name: "Show the whole board" }));

  await screen.findByText(boardItem.title);
  expect(screen.getByText("1 on the board")).toBeTruthy();
  expect(fetchBoardFeedback).toHaveBeenLastCalledWith(null);
  fireEvent.click(screen.getByRole("button", { name: "Show feedback from" }));
  expect(
    screen
      .getByRole("menuitemradio", { name: "Whole board" })
      .getAttribute("aria-checked")
  ).toBe("true");
});

it("switches back to this page from the scope menu and refreshes it", async () => {
  fetchBoardFeedback.mockResolvedValue({
    hasMore: false,
    items: [boardItem],
    total: 1,
  });
  render(<InboxPanel boardCall={boardCall} onShowSelector={() => false} />);

  await screen.findByText("1 on this page");
  fireEvent.click(screen.getByRole("button", { name: "Show feedback from" }));
  fireEvent.click(screen.getByRole("menuitemradio", { name: "Whole board" }));
  await screen.findByText("1 on the board");
  expect(fetchBoardFeedback).toHaveBeenLastCalledWith(null);

  fireEvent.click(screen.getByRole("button", { name: "Show feedback from" }));
  fireEvent.click(screen.getByRole("menuitemradio", { name: "This page" }));
  await screen.findByText("1 on this page");
  const pageCalls = fetchBoardFeedback.mock.calls.length;
  fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
  await waitFor(() =>
    expect(fetchBoardFeedback).toHaveBeenCalledTimes(pageCalls + 1)
  );
  expect(fetchBoardFeedback.mock.lastCall?.[0]).not.toBeNull();
});
