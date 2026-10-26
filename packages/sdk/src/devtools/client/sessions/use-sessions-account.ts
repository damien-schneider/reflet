import { useMemo, useState } from "react";
import type { SessionTransport } from "../../../sessions/api/session-api";
import {
  devtoolsTransport,
  machineAccountTransport,
} from "../../../sessions/api/session-transports";
import type { MachineAccount } from "../../protocol";
import type { DevRouteState } from "../route/use-dev-route";

const CHOSEN_ACCOUNT_KEY = "reflet-devtools-sessions-account";
const OWN_CONNECTION = devtoolsTransport();

export type SessionsAccount =
  | { kind: "none" }
  | { kind: "own" }
  | {
      accounts: MachineAccount[];
      choose: (accountId: string) => void;
      chosen: MachineAccount;
      kind: "machine";
    };

function readChosenAccount(): string | null {
  try {
    return localStorage.getItem(CHOSEN_ACCOUNT_KEY);
  } catch {
    return null;
  }
}

function storeChosenAccount(accountId: string) {
  try {
    localStorage.setItem(CHOSEN_ACCOUNT_KEY, accountId);
  } catch {
    // Blocked storage only costs the remembered account on the next reload.
  }
}

export function useSessionsAccount(
  route: DevRouteState,
  canConnect: boolean
): { account: SessionsAccount; transport: SessionTransport | null } {
  const [chosenId, setChosenId] = useState(readChosenAccount);
  const status = route.kind === "ready" ? route.status : null;
  const accounts = status?.machineAccounts ?? [];
  const chosen =
    accounts.find((account) => account.id === chosenId) ?? accounts[0] ?? null;
  const borrowedId =
    status?.board.kind === "disconnected" && !canConnect && chosen
      ? chosen.id
      : null;
  const borrowedTransport = useMemo(
    () => (borrowedId === null ? null : machineAccountTransport(borrowedId)),
    [borrowedId]
  );

  if (status?.board.kind === "connected") {
    return { account: { kind: "own" }, transport: OWN_CONNECTION };
  }
  if (borrowedTransport === null || chosen === null) {
    return { account: { kind: "none" }, transport: null };
  }
  const choose = (accountId: string) => {
    setChosenId(accountId);
    storeChosenAccount(accountId);
  };
  return {
    account: { accounts, choose, chosen, kind: "machine" },
    transport: borrowedTransport,
  };
}
