import type { WorkspaceState } from "../../../sessions/ui/session-workspace";
import { reportFailure } from "../notices";
import { disconnectBoard } from "../route/dev-route";
import { CONNECT_REQUIREMENT } from "../route/route-hint";
import type { DevRouteState } from "../route/use-dev-route";
import { AccountFooter, AccountNote } from "./account-footer";
import { ConnectFooter } from "./connect-footer";

async function disconnect(refresh: () => void) {
  try {
    const { revoked } = await disconnectBoard();
    if (!revoked) {
      reportFailure(
        "The Reflet token was not revoked",
        new Error(
          "Disconnected here, but Reflet could not be reached. Revoke it from Account → Devtools on reflet.app."
        )
      );
    }
  } catch (error) {
    reportFailure("The dev server did not disconnect", error);
  }
  refresh();
}

export function DevtoolsAccount({
  connectKey,
  refresh,
  route,
  workspace,
}: {
  connectKey: string | null;
  refresh: () => void;
  route: DevRouteState;
  workspace: WorkspaceState;
}) {
  if (route.kind !== "ready") {
    return null;
  }
  const { board } = route.status;
  if (board.kind === "secretKey") {
    return <AccountNote>Reaching the board with REFLET_SECRET_KEY</AccountNote>;
  }
  if (board.kind === "disconnected") {
    return connectKey === null ? (
      <AccountNote>Not connected. {CONNECT_REQUIREMENT}</AccountNote>
    ) : (
      <ConnectFooter publicKey={connectKey} />
    );
  }
  return (
    <AccountFooter
      actions={[
        {
          label: "Disconnect",
          onSelect: () => disconnect(refresh),
          variant: "danger",
        },
      ]}
      organizationName={board.organizationName}
      person={
        workspace.kind === "ready" ? workspace.workspace.identity.user : null
      }
    />
  );
}
