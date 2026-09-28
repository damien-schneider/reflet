import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { BoardTab } from "./board-tab";

const { startBoardConnect } = vi.hoisted(() => ({
  startBoardConnect: vi.fn(),
}));
vi.mock("../route/dev-route", () => ({
  disconnectBoard: vi.fn(),
  startBoardConnect,
}));
vi.mock("../inbox/inbox-panel", () => ({ InboxPanel: () => null }));
vi.mock("../notices", () => ({ reportFailure: vi.fn() }));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it("can start a new connection after cancelling or expiring the consent tab", async () => {
  vi.spyOn(window, "open").mockReturnValue(null);
  startBoardConnect.mockResolvedValue({
    authorizeUrl: "https://reflet.app/auth/devtools",
  });
  render(
    <BoardTab
      canConnect
      onOpenCode={vi.fn()}
      onShowSelector={() => false}
      publicKey="fb_pub_test"
      refresh={vi.fn()}
      route={{
        kind: "ready",
        status: {
          board: { canConnect: true, kind: "disconnected" },
          editor: "vscode",
          marker: "reflet-devtools",
        },
      }}
    />
  );
  fireEvent.click(screen.getByRole("button", { name: "Connect to Reflet" }));
  await screen.findByRole("link", { name: "Open Reflet again" });
  fireEvent.click(screen.getByRole("button", { name: "Start again" }));
  await waitFor(() => expect(startBoardConnect).toHaveBeenCalledTimes(2));
});
