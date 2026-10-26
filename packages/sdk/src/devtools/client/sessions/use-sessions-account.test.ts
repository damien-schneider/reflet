import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  type BoardAccess,
  DEVTOOLS_ACCOUNT_HEADER,
  DEVTOOLS_STATUS_MARKER,
} from "../../protocol";
import type { DevRouteState } from "../route/use-dev-route";
import { useSessionsAccount } from "./use-sessions-account";

const ONE_REC = { id: "account_one_rec", organizationName: "One Rec" };
const CONTROL_UI = { id: "account_control_ui", organizationName: "Control UI" };
const CANNOT_CONNECT: BoardAccess = { canConnect: false, kind: "disconnected" };

function readyRoute(board: BoardAccess): DevRouteState {
  return {
    kind: "ready",
    status: {
      board,
      editor: "vscode",
      machineAccounts: [ONE_REC, CONTROL_UI],
      marker: DEVTOOLS_STATUS_MARKER,
    },
  };
}

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
});

it("leaves sessions to the app's own Connect when it can connect", () => {
  const { result } = renderHook(() =>
    useSessionsAccount(
      readyRoute({ canConnect: true, kind: "disconnected" }),
      true
    )
  );

  expect(result.current.account.kind).toBe("none");
  expect(result.current.transport).toBeNull();
});

it("records under the app's own connection once it has one", () => {
  const { result } = renderHook(() =>
    useSessionsAccount(
      readyRoute({ kind: "connected", organizationName: "Acme" }),
      false
    )
  );

  expect(result.current.account.kind).toBe("own");
});

it("records as the account chosen among other apps', across reloads", async () => {
  const fetchMock = vi.fn((_url: string, _init: RequestInit) =>
    Promise.resolve(Response.json({}))
  );
  vi.stubGlobal("fetch", fetchMock);
  const route = readyRoute(CANNOT_CONNECT);
  const first = renderHook(() => useSessionsAccount(route, false));
  const { account } = first.result.current;
  if (account.kind !== "machine") {
    throw new Error(`Expected another app's account, got ${account.kind}`);
  }
  expect(account.chosen).toEqual(ONE_REC);
  act(() => account.choose(CONTROL_UI.id));
  first.unmount();

  const reloaded = renderHook(() => useSessionsAccount(route, false));
  await reloaded.result.current.transport?.request({
    method: "GET",
    path: "/api/v1/sessions/identity",
    schema: z.unknown(),
  });

  expect(reloaded.result.current.account).toMatchObject({
    chosen: CONTROL_UI,
    kind: "machine",
  });
  const sentHeaders = new Headers(fetchMock.mock.calls[0]?.[1].headers);
  expect(sentHeaders.get(DEVTOOLS_ACCOUNT_HEADER)).toBe(CONTROL_UI.id);
});
