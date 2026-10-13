import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { DEVTOOLS_STATUS_MARKER, type DevtoolsStatus } from "../../protocol";
import type { DevRouteState } from "../route/use-dev-route";
import { type DevtoolsSessions, SessionsTab } from "./devtools-sessions";

vi.mock("../../../sessions/local/local-sessions", () => ({
  purgeAccount: vi.fn(),
  useLocalDrafts: () => [],
  useSyncStatus: () => ({
    blockedBy: null,
    isOnline: true,
    lastError: null,
    pendingBytes: 0,
    pendingOperations: 0,
  }),
}));

afterEach(cleanup);

function routeWithBoard(board: DevtoolsStatus["board"]): DevRouteState {
  return {
    kind: "ready",
    status: { board, editor: "vscode", marker: DEVTOOLS_STATUS_MARKER },
  };
}

function renderTab(
  route: DevRouteState,
  state: DevtoolsSessions["state"],
  connectKey: string | null = "fb_pub_test"
) {
  const actions = { onStarted: vi.fn() };
  render(
    <SessionsTab
      actions={actions}
      connectKey={connectKey}
      route={route}
      sessions={{ navigation: { onOpen: vi.fn(), open: null }, state }}
    />
  );
  return actions;
}

it("offers to connect right here before recording", () => {
  renderTab(routeWithBoard({ canConnect: true, kind: "disconnected" }), {
    kind: "idle",
  });

  expect(
    screen.getByText("Sessions are recorded under your Reflet account.")
  ).toBeTruthy();
  expect(
    screen.getByRole("button", { name: "Connect to Reflet" })
  ).toBeTruthy();
  expect(screen.queryByText(/Board tab/)).toBeNull();
});

it("explains that the secret key cannot record sessions", () => {
  renderTab(routeWithBoard({ kind: "secretKey" }), { kind: "idle" });

  expect(screen.getByText(/rather than REFLET_SECRET_KEY/)).toBeTruthy();
});

it("offers to retry when the workspace did not open", () => {
  const retry = vi.fn();
  renderTab(routeWithBoard({ kind: "connected", organizationName: "Acme" }), {
    kind: "failed",
    message: "Offline",
    retry,
  });

  expect(screen.getByText("Sessions did not open: Offline")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(retry).toHaveBeenCalled();
});
