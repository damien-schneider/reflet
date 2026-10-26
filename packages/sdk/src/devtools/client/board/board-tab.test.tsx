import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { MISSING_SECRET_KEY_HINT } from "../route/route-hint";
import type { DevRouteState } from "../route/use-dev-route";
import { BoardTab } from "./board-tab";

vi.mock("../inbox/inbox-panel", () => ({ InboxPanel: () => null }));

afterEach(cleanup);

const DISCONNECTED: DevRouteState = {
  kind: "ready",
  status: {
    board: { canConnect: true, kind: "disconnected" },
    editor: "vscode",
    machineAccounts: [],
    marker: "reflet-devtools",
  },
};

it("points to the connect footer while the board is disconnected", () => {
  render(
    <BoardTab
      canConnect
      onOpenCode={vi.fn()}
      onShowSelector={() => false}
      route={DISCONNECTED}
    />
  );

  expect(
    screen.getByText(
      "Connect to Reflet below to see this page's feedback and add notes to your board."
    )
  ).toBeTruthy();
  expect(screen.queryByRole("button")).toBeNull();
});

it("explains the missing secret key when this app cannot connect", () => {
  render(
    <BoardTab
      canConnect={false}
      onOpenCode={vi.fn()}
      onShowSelector={() => false}
      route={DISCONNECTED}
    />
  );

  expect(screen.getByText(MISSING_SECRET_KEY_HINT)).toBeTruthy();
});
