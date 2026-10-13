import { useState } from "react";
import type { CodeTarget } from "../code/code-panel";
import { InboxPanel } from "../inbox/inbox-panel";
import { reportFailure } from "../notices";
import { ConnectPrompt } from "../route/connect-prompt";
import { disconnectBoard } from "../route/dev-route";
import { MISSING_SECRET_KEY_HINT, MissingRouteHint } from "../route/route-hint";
import type { DevRouteState } from "../route/use-dev-route";

function ConnectionBar({
  organizationName,
  refresh,
}: {
  organizationName: string;
  refresh: () => void;
}) {
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const disconnect = async () => {
    setIsDisconnecting(true);
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
    setIsDisconnecting(false);
    refresh();
  };

  return (
    <div className="dt-actions">
      <span className="dt-status">Connected to {organizationName}</span>
      <button
        className="dt-btn"
        data-variant="danger"
        disabled={isDisconnecting}
        onClick={disconnect}
        type="button"
      >
        Disconnect
      </button>
    </div>
  );
}

export function BoardTab({
  canConnect,
  onOpenCode,
  onShowSelector,
  publicKey,
  refresh,
  route,
}: {
  canConnect: boolean;
  onOpenCode: (target: CodeTarget) => void;
  onShowSelector: (selector: string) => boolean;
  publicKey: string | null;
  refresh: () => void;
  route: DevRouteState;
}) {
  if (route.kind === "missing") {
    return (
      <MissingRouteHint purpose="see your board's feedback for this page" />
    );
  }
  if (route.kind === "checking") {
    return null;
  }
  const { board } = route.status;
  if (board.kind === "disconnected") {
    return canConnect && publicKey !== null ? (
      <ConnectPrompt
        publicKey={publicKey}
        purpose="See this page's feedback and send notes to your board."
      />
    ) : (
      <p className="dt-hint">{MISSING_SECRET_KEY_HINT}</p>
    );
  }
  const inbox = (
    <InboxPanel onOpenCode={onOpenCode} onShowSelector={onShowSelector} />
  );
  if (board.kind === "secretKey") {
    return inbox;
  }
  return (
    <>
      <ConnectionBar
        organizationName={board.organizationName}
        refresh={refresh}
      />
      {inbox}
    </>
  );
}
