import { useState } from "react";
import type { CodeTarget } from "../code/code-panel";
import { InboxPanel } from "../inbox/inbox-panel";
import { reportFailure } from "../notices";
import { disconnectBoard, startBoardConnect } from "../route/dev-route";
import { MISSING_SECRET_KEY_HINT, MissingRouteHint } from "../route/route-hint";
import type { DevRouteState } from "../route/use-dev-route";

type ConnectPromptState =
  | { kind: "idle" }
  | { kind: "starting" }
  | { authorizeUrl: string; kind: "waiting" };

function ConnectPrompt({ publicKey }: { publicKey: string }) {
  const [prompt, setPrompt] = useState<ConnectPromptState>({ kind: "idle" });

  const connect = async () => {
    // Opened before any await: browsers only allow popups inside the click.
    const tab = window.open("", "_blank");
    if (tab) {
      tab.opener = null;
    }
    setPrompt({ kind: "starting" });
    try {
      const { authorizeUrl } = await startBoardConnect(publicKey);
      if (tab) {
        tab.location.href = authorizeUrl;
      } else {
        window.open(authorizeUrl, "_blank", "noopener");
      }
      setPrompt({ authorizeUrl, kind: "waiting" });
    } catch (error) {
      tab?.close();
      setPrompt({ kind: "idle" });
      reportFailure("Could not connect to Reflet", error);
    }
  };

  if (prompt.kind === "waiting") {
    return (
      <div className="dt-empty">
        <p>
          Finish connecting in the Reflet tab. This panel updates when you come
          back.
        </p>
        <a
          className="dt-btn"
          href={prompt.authorizeUrl}
          rel="noopener noreferrer"
          target="_blank"
        >
          Open Reflet again
        </a>
        <button className="dt-btn" onClick={connect} type="button">
          Start again
        </button>
      </div>
    );
  }
  return (
    <div className="dt-empty">
      <p>See this page's feedback and send notes to your board.</p>
      <button
        className="dt-btn"
        data-variant="primary"
        disabled={prompt.kind === "starting"}
        onClick={connect}
        type="button"
      >
        Connect to Reflet
      </button>
    </div>
  );
}

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
      <ConnectPrompt publicKey={publicKey} />
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
