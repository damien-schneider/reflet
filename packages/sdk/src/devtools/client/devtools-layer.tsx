import { useCallback, useEffect, useMemo, useState } from "react";
import type { RefletFeedbackProps } from "../../feedback/types";
import { SelectionOutline } from "../../feedback/ui/selection-outline";
import { RecordingLayer } from "../../sessions/ui/recording/recording-layer";
import { sessionSheetPlace } from "../../sessions/ui/sessions-panel";
import { SESSIONS_STYLES } from "../../sessions/ui/sessions-styles";
import { DevtoolsAccount } from "./account/devtools-account";
import { BoardTab } from "./board/board-tab";
import { CodeTab } from "./code/code-tab";
import {
  type CodeLookup,
  type CodeTarget,
  inspectedNode,
  useCodeLookup,
} from "./code/use-code-lookup";
import {
  DevtoolsBar,
  DevtoolsBarButtons,
  SHEET_TABS,
  type SheetTab,
} from "./devtools-bar";
import { DevtoolsSheet } from "./devtools-sheet";
import { DEVTOOLS_STYLES } from "./devtools-styles";
import { findOnPage, usePageHighlight } from "./find-on-page";
import { LiveControls, LivePicker } from "./live/live-controls";
import { useLiveLink } from "./live/use-live-link";
import { enrichNote, hasTriedToLocate } from "./notes/capture-note";
import { NotePicker } from "./notes/note-picker";
import {
  isActiveNote,
  isNoteOnPage,
  type NotesSnapshot,
  unsentNoteCount,
  useNotes,
} from "./notes/note-store";
import { NotesPanel } from "./notes/notes-panel";
import { Notices } from "./notices";
import { NotePins } from "./pins/note-pins";
import { callReflet } from "./route/dev-route";
import { MISSING_SECRET_KEY_HINT } from "./route/route-hint";
import { type DevRouteState, useDevRoute } from "./route/use-dev-route";
import {
  type DevtoolsSessions,
  SessionsScope,
  SessionsTab,
  useDevtoolsSessions,
} from "./sessions/devtools-sessions";
import { FIRST_SHEET_TAB, useSheetTab } from "./use-sheet-tab";

function sendBlockedReason(
  route: DevRouteState,
  canConnect: boolean
): string | null {
  if (route.kind === "checking") {
    return "Connecting to the Reflet dev route…";
  }
  if (route.kind === "missing") {
    return "Add the Reflet dev route to add notes to your board.";
  }
  if (route.status.board.kind !== "disconnected") {
    return null;
  }
  return canConnect
    ? "Connect to Reflet below to add notes to your board."
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

function SheetPanel({
  canConnect,
  codeLookup,
  handlers,
  notes,
  openTab,
  route,
  sessions,
}: {
  canConnect: boolean;
  codeLookup: CodeLookup | null;
  handlers: {
    onClose: () => void;
    onOpenCode: (target: CodeTarget) => void;
    onSelectCodeFrame: (index: number) => void;
    onPick: () => void;
    onShowSelector: (selector: string) => boolean;
  };
  notes: NotesSnapshot;
  openTab: SheetTab;
  route: DevRouteState;
  sessions: DevtoolsSessions;
}) {
  if (openTab === "notes") {
    return (
      <NotesPanel
        boardCall={callReflet}
        notes={notes}
        onOpenCode={handlers.onOpenCode}
        onPick={handlers.onPick}
        onShowSelector={handlers.onShowSelector}
        sendBlockedReason={sendBlockedReason(route, canConnect)}
      />
    );
  }
  if (openTab === "inbox") {
    return (
      <BoardTab
        canConnect={canConnect}
        onOpenCode={handlers.onOpenCode}
        onShowSelector={handlers.onShowSelector}
        route={route}
      />
    );
  }
  if (openTab === "sessions") {
    return (
      <SessionsTab
        actions={{
          onStarted: handlers.onClose,
          onWriteNote: () => {
            handlers.onClose();
            handlers.onPick();
          },
        }}
        canConnect={canConnect}
        route={route}
        sessions={sessions}
      />
    );
  }
  return (
    codeLookup && (
      <CodeTab
        lookup={codeLookup}
        onSelectFrame={handlers.onSelectCodeFrame}
        route={route}
      />
    )
  );
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
  const live = useLiveLink(route.kind === "ready");
  const [isPicking, setIsPicking] = useState(false);
  const [isLivePointing, setIsLivePointing] = useState(false);
  if (isLivePointing && live.status.state !== "recording") {
    setIsLivePointing(false);
  }
  const sheet = useSheetTab();
  const { openTab } = sheet;
  const { clearHighlight, highlighted, showSelector } = usePageHighlight();
  const { codeLookup, inspectElement, openCode, selectFrame } = useCodeLookup(
    sheet.select
  );

  const edge = position.startsWith("top") ? "top" : "bottom";
  const side = position.endsWith("right") ? "right" : "left";
  const canReadSource = route.kind === "ready";
  const canConnect = canConnectBoard(route, publicKey);
  const isRecessed = isWidgetOpen || isPicking || isLivePointing;

  const closeSheet = () => {
    sheet.close();
    clearHighlight();
  };

  const startPick = useCallback(() => setIsPicking(true), []);
  const cancelPick = useCallback(() => setIsPicking(false), []);
  const stopLivePointing = useCallback(() => setIsLivePointing(false), []);

  const inspect = useMemo(
    () => ({
      label: "Code",
      onInspect: (element: Element) => {
        setIsPicking(false);
        inspectElement(element);
      },
    }),
    [inspectElement]
  );

  const tabs = SHEET_TABS.filter((tab) => tab !== "code" || codeLookup);
  const openPanel = (tab: SheetTab | null) =>
    sheet.select(
      tab ?? (tabs.includes(sheet.lastTab) ? sheet.lastTab : FIRST_SHEET_TAB)
    );
  const sheetPlace =
    openTab === "sessions" && sessions.state.kind === "ready"
      ? sessionSheetPlace(sessions.navigation)
      : null;

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
            footer={
              sheetPlace === null && (
                <DevtoolsAccount
                  connectKey={canConnect ? publicKey : null}
                  refresh={refresh}
                  route={route}
                  workspace={sessions.state}
                />
              )
            }
            navigation={{
              onSelectTab: sheet.select,
              place: sheetPlace,
              tab: openTab,
              tabs,
            }}
            onClose={closeSheet}
            side={side}
          >
            <SheetPanel
              canConnect={canConnect}
              codeLookup={codeLookup}
              handlers={{
                onClose: closeSheet,
                onOpenCode: openCode,
                onPick: startPick,
                onSelectCodeFrame: selectFrame,
                onShowSelector: showSelector,
              }}
              notes={notes}
              openTab={openTab}
              route={route}
              sessions={sessions}
            />
          </DevtoolsSheet>
        )}
        <DevtoolsBar edge={edge} side={side}>
          <DevtoolsBarButtons
            canOpenCode
            onOpen={openPanel}
            onPick={startPick}
            unsentNoteCount={unsentNoteCount(notes)}
          />
          <LiveControls live={live} onPointAt={() => setIsLivePointing(true)} />
        </DevtoolsBar>
        {openTab && (
          <SelectionOutline
            node={
              (openTab === "code" && inspectedNode(codeLookup)) || highlighted
            }
          />
        )}
        <Notices />
        {sessions.state.kind === "ready" && (
          <RecordingLayer
            onFinished={(target) => {
              sessions.navigation.go({ target, view: "review" });
              sheet.select("sessions");
            }}
          />
        )}
        {isPicking && (
          <NotePicker
            canReadSource={canReadSource}
            inspect={inspect}
            onDone={cancelPick}
          />
        )}
        {isLivePointing && (
          <LivePicker onDone={stopLivePointing} select={live.select} />
        )}
      </div>
    </SessionsScope>
  );
}
