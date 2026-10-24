import { useState } from "react";
import { reportFailure } from "../../../devtools/client/notices";
import {
  DEFAULT_WIDGET_LABELS,
  type FeedbackWidgetLabels,
} from "../../../feedback/types";
import { ElementPicker } from "../../../feedback/ui/picker";
import type { RecorderSnapshot } from "../../recorder/session-recorder";
import { useRecorderSnapshot } from "../../recorder/use-recorder-snapshot";
import { useSessionWorkspace } from "../session-workspace";
import type { SessionTarget } from "../start/session-list";
import { LiveFeed } from "./live-feed";
import { RecordingBar } from "./recording-bar";

const SESSION_PICKER_LABELS: FeedbackWidgetLabels = {
  ...DEFAULT_WIDGET_LABELS,
  attachElement: "Add to session",
  elementNote: "Note for this element (optional)",
  elementNotePlaceholder: "What about it?",
  pickElementHint: "Point at the element you are talking about",
};

function showsBar(snapshot: RecorderSnapshot): boolean {
  if (snapshot.sessionKey === null) {
    return false;
  }
  return (
    snapshot.phase === "recording" ||
    snapshot.phase === "paused" ||
    snapshot.phase === "finishing" ||
    snapshot.phase === "failed"
  );
}

function isCapturing(snapshot: RecorderSnapshot): boolean {
  return snapshot.phase === "recording" || snapshot.phase === "paused";
}

/** Lives outside the sheet: recording goes on while every panel is closed. */
export function RecordingLayer({
  onFinished,
}: {
  onFinished: (target: SessionTarget) => void;
}) {
  const { recorder } = useSessionWorkspace();
  const snapshot = useRecorderSnapshot(recorder);
  const [isPointing, setIsPointing] = useState(false);
  const [hiddenFor, setHiddenFor] = useState<string | null>(null);
  const isLiveShown = hiddenFor !== snapshot.sessionKey;

  if (!showsBar(snapshot)) {
    return null;
  }
  const finish = async () => {
    setIsPointing(false);
    const { sessionId } = recorder.getSnapshot();
    try {
      const { sessionKey } = await recorder.finish();
      onFinished({ sessionId, sessionKey });
    } catch (error) {
      reportFailure("The session did not finish", error, finish);
    }
  };
  const cancel = async () => {
    setIsPointing(false);
    try {
      await recorder.cancel();
    } catch (error) {
      reportFailure("The recording was not deleted", error);
    }
  };

  return (
    <>
      <div className="dt-rec-dock">
        {isLiveShown && isCapturing(snapshot) && (
          <LiveFeed snapshot={snapshot} />
        )}
        <RecordingBar
          isLiveShown={isLiveShown}
          onCancel={cancel}
          onFinish={finish}
          onPointAt={() => setIsPointing(true)}
          onToggleLive={() =>
            setHiddenFor(isLiveShown ? snapshot.sessionKey : null)
          }
          snapshot={snapshot}
        />
      </div>
      {isPointing && snapshot.phase === "recording" && (
        <ElementPicker
          labels={SESSION_PICKER_LABELS}
          onCancel={() => setIsPointing(false)}
          onPick={(element, note) => {
            setIsPointing(false);
            recorder.select(element, note.trim() || undefined);
          }}
        />
      )}
    </>
  );
}
