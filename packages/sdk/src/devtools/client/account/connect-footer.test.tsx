import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ConnectFooter } from "./connect-footer";

const { startBoardConnect } = vi.hoisted(() => ({
  startBoardConnect: vi.fn(),
}));
vi.mock("../route/dev-route", () => ({ startBoardConnect }));
vi.mock("../notices", () => ({ reportFailure: vi.fn() }));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  startBoardConnect.mockReset();
});

it("can start a new connection after cancelling or expiring the consent tab", async () => {
  vi.spyOn(window, "open").mockReturnValue(null);
  startBoardConnect.mockResolvedValue({
    authorizeUrl: "https://reflet.app/auth/devtools",
  });
  render(<ConnectFooter publicKey="fb_pub_test" />);

  expect(screen.getByText("Not connected")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Connect to Reflet" }));
  expect(
    await screen.findByRole("link", { name: "Open Reflet again" })
  ).toHaveProperty("href", "https://reflet.app/auth/devtools");
  expect(startBoardConnect).toHaveBeenCalledWith("fb_pub_test");
  fireEvent.click(screen.getByRole("button", { name: "Start again" }));
  await waitFor(() => expect(startBoardConnect).toHaveBeenCalledTimes(2));
});
