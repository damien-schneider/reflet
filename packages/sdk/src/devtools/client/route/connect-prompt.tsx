import { useState } from "react";
import { reportFailure } from "../notices";
import { startBoardConnect } from "./dev-route";

type ConnectPromptState =
  | { kind: "idle" }
  | { kind: "starting" }
  | { authorizeUrl: string; kind: "waiting" };

export function ConnectPrompt({
  publicKey,
  purpose,
}: {
  publicKey: string;
  purpose: string;
}) {
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
      <p>{purpose}</p>
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
