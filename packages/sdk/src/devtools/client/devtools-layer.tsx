import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_WIDGET_LABELS,
  type FeedbackWidgetLabels,
  type RefletFeedbackProps,
} from "../../feedback/types";
import { ElementPicker } from "../../feedback/ui/picker";
import { SelectionOutline } from "../../feedback/ui/selection-outline";
import { RecordingLayer } from "../../sessions/ui/recording/recording-layer";
import { SESSIONS_STYLES } from "../../sessions/ui/sessions-styles";
import { BoardTab } from "./board/board-tab";
import { copyToClipboard } from "./clipboard";
import { CodeTab, titleFor, useCodeLookup } from "./code/code-tab";
import { DevtoolsBar, DevtoolsBarButtons, type SheetTab } from "./devtools-bar";
import { DevtoolsSheet } from "./devtools-sheet";
import { DEVTOOLS_STYLES } from "./devtools-styles";
import { findOnPage } from "./find-on-page";
import { noteAsContext } from "./notes/agent-prompt";
import {
  draftLocatedNote,
  draftNote,
  enrichNote,
  hasTriedToLocate,
} from "./notes/capture-note";
import {
  type DevNote,
  isActiveNote,
  isNoteOnPage,
  type NotesSnapshot,
  noteStore,
  useNotes,
} from "./notes/note-store";
import { NotesPanel } from "./notes/notes-panel";
import { announce, Notices, reportFailure } from "./notices";
import { NotePins } from "./pins/note-pins";
import { MISSING_SECRET_KEY_HINT } from "./route/route-hint";
import { type DevRouteState, useDevRoute } from "./route/use-dev-route";
import {
  SessionsScope,
  SessionsTab,
  useDevtoolsSessions,
} from "./sessions/devtools-sessions";

const PICKER_LABELS: FeedbackWidgetLabels = {
  ...DEFAULT_WIDGET_LABELS,
  attachElement: "Save note",
  elementNote: "Dev note",
  elementNotePlaceholder: "What should change here?",
  pickElementHint: "Pick an element to note or copy it",
};

function sendBlockedReason(
  route: DevRouteState,
  canConnect: boolean
): string | null {
  if (route.kind === "checking") {
    return "Connecting to the Reflet dev route…";
  }
  if (route.kind === "missing") {
    return "Add the Reflet dev route to send notes to your board.";
  }
  if (route.status.board.kind !== "disconnected") {
    return null;
  }
  return canConnect
    ? "Connect to Reflet in the Board tab to send notes."
    : MISSING_SECRET_KEY_HINT;
}
function canConnectBoard(route: DevRouteState, publicKey: string | null) {
  return (
    route.kind === "ready" &&
    route.status.board.kind === "disconnected" &&
    route.status.board.canConnect &&
    publicKey !== null
  );
}

function unsentNoteCount(notes: NotesSnapshot): number {
  return notes.notes.filter((note) => isActiveNote(note) && !note.sent).length;
}

/** Shown the moment it is added; source and close-up follow, best effort. */
async function saveNote(
  note: DevNote,
  element: Element,
  canReadSource: boolean
): Promise<void> {
  noteStore.setActivity(note.id, "locating");
  try {
    await noteStore.add(note);
  } catch (error) {
    noteStore.setActivity(note.id, null);
    reportFailure("The note was not saved", error, () => {
      saveNote(note, element, canReadSource);
    });
    return;
  }
  await enrichNote(note.id, element, canReadSource).catch(() => null);
}

/** A reload in the middle of locating left these without a source; finish the job once. */
function useResumeLocating(notes: NotesSnapshot, route: DevRouteState) {
  useEffect(() => {
    if (route.kind === "checking") {
      return;
    }
    for (const note of notes.notes) {
      const isUnlocated =
        note.source === null &&
        isActiveNote(note) &&
        notes.activity[note.id] === undefined &&
        !hasTriedToLocate(note.id) &&
        isNoteOnPage(note, window.location.pathname);
      const element = isUnlocated ? findOnPage(note.selection.selector) : null;
      if (element) {
        enrichNote(note.id, element, route.kind === "ready").catch(() => null);
      }
    }
  }, [notes, route.kind]);
}

export function DevtoolsLayer({
  isWidgetOpen,
  position,
  publicKey,
}: {
  isWidgetOpen: boolean;
  position: NonNullable<RefletFeedbackProps["position"]>;
  publicKey: string | null;
}) {
  const { refresh, route } = useDevRoute();
  const notes = useNotes();
  useResumeLocating(notes, route);
  const sessions = useDevtoolsSessions({ onUnauthorized: refresh, route });
  const [isPicking, setIsPicking] = useState(false);
  const [openTab, setOpenTab] = useState<SheetTab | null>(null);
  const [highlighted, setHighlighted] = useState<Element | null>(null);
  const { codeLookup, inspectElement, openCode } = useCodeLookup(setOpenTab);

  const edge = position.startsWith("top") ? "top" : "bottom";
  const side = position.endsWith("right") ? "right" : "left";
  const canReadSource = route.kind === "ready";
  const canConnect = canConnectBoard(route, publicKey);
  const isRecessed = isWidgetOpen || isPicking;

  const closeSheet = useCallback(() => {
    setOpenTab(null);
    setHighlighted(null);
  }, []);

  const startPick = useCallback(() => setIsPicking(true), []);
  const cancelPick = useCallback(() => setIsPicking(false), []);

  const showSelector = useCallback((selector: string) => {
    const element = findOnPage(selector);
    setHighlighted(element);
    element?.scrollIntoView({ behavior: "smooth", block: "center" });
    return element !== null;
  }, []);

  const inspect = useMemo(
    () => ({
      label: "View code",
      onInspect: (element: Element) => {
        setIsPicking(false);
        inspectElement(element);
      },
    }),
    [inspectElement]
  );

  const writeNote = useCallback(
    (element: Element, text: string) => {
      setIsPicking(false);
      saveNote(draftNote(element, text), element, canReadSource);
    },
    [canReadSource]
  );

  const copy = useMemo(
    () => ({
      label: "Copy",
      onCopy: (element: Element, text: string) => {
        setIsPicking(false);
        const title = titleFor(element);
        copyToClipboard(
          draftLocatedNote(element, text, canReadSource).then(noteAsContext)
        )
          .then(() => announce(`Copied ${title}`))
          .catch((error: unknown) =>
            reportFailure(`${title} was not copied`, error)
          );
      },
    }),
    [canReadSource]
  );

  const tabs: SheetTab[] = codeLookup
    ? ["notes", "sessions", "inbox", "code"]
    : ["notes", "sessions", "inbox"];
  const writeNoteInstead = () => {
    closeSheet();
    startPick();
  };

  return (
    <SessionsScope sessions={sessions}>
      <div
        className="dt"
        data-recessed={isRecessed}
        data-sheet-open={openTab !== null}
      >
        <style>{`${DEVTOOLS_STYLES}${SESSIONS_STYLES}`}</style>
        <NotePins isVisible={!isRecessed} notes={notes} onOpenCode={openCode} />
        {openTab && (
          <DevtoolsSheet
            onClose={closeSheet}
            onPick={startPick}
            onSelectTab={setOpenTab}
            side={side}
            tab={openTab}
            tabs={tabs}
          >
            {openTab === "notes" && (
              <NotesPanel
                notes={notes}
                onOpenCode={openCode}
                onShowSelector={showSelector}
                sendBlockedReason={sendBlockedReason(route, canConnect)}
              />
            )}
            {openTab === "inbox" && (
              <BoardTab
                canConnect={canConnect}
                onOpenCode={openCode}
                onShowSelector={showSelector}
                publicKey={publicKey}
                refresh={refresh}
                route={route}
              />
            )}
            {openTab === "sessions" && (
              <SessionsTab
                actions={{
                  onConnect: () => setOpenTab("inbox"),
                  onStarted: closeSheet,
                  onWriteNote: writeNoteInstead,
                }}
                route={route}
                sessions={sessions}
              />
            )}
            {openTab === "code" && codeLookup && (
              <CodeTab lookup={codeLookup} route={route} />
            )}
          </DevtoolsSheet>
        )}
        <DevtoolsBar edge={edge} side={side}>
          <DevtoolsBarButtons
            noteCount={unsentNoteCount(notes)}
            onPick={startPick}
            onToggleSheet={(tab) =>
              setOpenTab((current) => (current === tab ? null : tab))
            }
            openTab={openTab}
          />
        </DevtoolsBar>
        {openTab && <SelectionOutline node={highlighted} />}
        <Notices />
        {sessions.state.kind === "ready" && (
          <RecordingLayer
            onFinished={(target) => {
              sessions.navigation.onOpen(target);
              setOpenTab("sessions");
            }}
          />
        )}
        {isPicking && (
          <ElementPicker
            copy={copy}
            inspect={inspect}
            labels={PICKER_LABELS}
            onCancel={cancelPick}
            onPick={writeNote}
          />
        )}
      </div>
    </SessionsScope>
  );
}
