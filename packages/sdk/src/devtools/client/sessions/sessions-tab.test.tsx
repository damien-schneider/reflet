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
  canConnect = true
) {
  const actions = { onStarted: vi.fn() };
  render(
    <SessionsTab
      actions={actions}
      canConnect={canConnect}
      route={route}
      sessions={{ navigation: { go: vi.fn(), place: { view: "home" } }, state }}
    />
  );
  return actions;
}

it("points to the connect footer before recording", () => {
  renderTab(routeWithBoard({ canConnect: true, kind: "disconnected" }), {
    kind: "idle",
  });

  expect(
    screen.getByText(
      "Sessions are recorded under your Reflet account. Connect to Reflet below to start one."
    )
  ).toBeTruthy();
  expect(screen.queryByRole("button")).toBeNull();
});

it("explains that connecting needs localhost and a public key", () => {
  renderTab(
    routeWithBoard({ canConnect: false, kind: "disconnected" }),
    { kind: "idle" },
    false
  );

  expect(
    screen.getByText(
      "Sessions are recorded under your Reflet account. Connecting to Reflet needs a public key and a local address (localhost, *.localhost or *.test)."
    )
  ).toBeTruthy();
});

it("explains that the secret key cannot record sessions", () => {
  renderTab(routeWithBoard({ kind: "secretKey" }), { kind: "idle" });

  expect(
    screen.getByText(
      "Sessions are recorded under your Reflet account. REFLET_SECRET_KEY can't stand for you: remove it from the dev server environment, then connect to Reflet."
    )
  ).toBeTruthy();
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
