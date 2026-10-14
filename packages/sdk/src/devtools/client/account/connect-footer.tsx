import { useState } from "react";
import { reportFailure } from "../notices";
import { startBoardConnect } from "../route/dev-route";

type ConnectState =
  | { kind: "idle" }
  | { kind: "starting" }
  | { authorizeUrl: string; kind: "waiting" };

function useBoardConnect(publicKey: string) {
  const [state, setState] = useState<ConnectState>({ kind: "idle" });

  const connect = async () => {
    // Opened before any await: browsers only allow popups inside the click.
    const tab = window.open("", "_blank");
    if (tab) {
      tab.opener = null;
    }
    setState({ kind: "starting" });
    try {
      const { authorizeUrl } = await startBoardConnect(publicKey);
      if (tab) {
        tab.location.href = authorizeUrl;
      } else {
        window.open(authorizeUrl, "_blank", "noopener");
      }
      setState({ authorizeUrl, kind: "waiting" });
    } catch (error) {
      tab?.close();
      setState({ kind: "idle" });
      reportFailure("Could not connect to Reflet", error);
    }
  };
  return { connect, state };
}

export function ConnectFooter({ publicKey }: { publicKey: string }) {
  const { connect, state } = useBoardConnect(publicKey);

  if (state.kind === "waiting") {
    return (
      <div className="dt-sheet-account" role="status">
        <p className="dt-meta">
          Finish connecting in the Reflet tab. This panel updates when you come
          back.
        </p>
        <div className="dt-actions">
          <a
            className="dt-btn"
            href={state.authorizeUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            Open Reflet again
          </a>
          <button className="dt-btn" onClick={connect} type="button">
            Start again
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="dt-sheet-account">
      <p className="dt-meta">Not connected</p>
      <button
        className="dt-btn"
        data-variant="primary"
        disabled={state.kind === "starting"}
        onClick={connect}
        type="button"
      >
        Connect to Reflet
      </button>
    </div>
  );
}
