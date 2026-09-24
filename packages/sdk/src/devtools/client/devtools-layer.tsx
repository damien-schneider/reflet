import { useCallback, useEffect, useMemo, useState } from "react";
import { describeElement } from "../../feedback/core/element-selector";
import {
  getFiberFromNode,
  resolveComponentStack,
} from "../../feedback/core/react-source";
import {
  DEFAULT_WIDGET_LABELS,
  type FeedbackWidgetLabels,
  type RefletFeedbackProps,
} from "../../feedback/types";
import { ElementPicker } from "../../feedback/ui/picker";
import { SelectionOutline } from "../../feedback/ui/selection-outline";
import { CodePanel, type CodeTarget } from "./code/code-panel";
import { DevtoolsBar, type SheetTab } from "./devtools-bar";
import { DevtoolsSheet } from "./devtools-sheet";
import { DEVTOOLS_STYLES } from "./devtools-styles";
import { locateElementSource } from "./element-source";
import { findOnPage } from "./find-on-page";
import { InboxPanel } from "./inbox/inbox-panel";
import { draftNote, enrichNote, hasTriedToLocate } from "./notes/capture-note";
import {
  type DevNote,
  isActiveNote,
  isNoteOnPage,
  type NotesSnapshot,
  noteStore,
  useNotes,
} from "./notes/note-store";
import { NotesPanel } from "./notes/notes-panel";
import { Notices, reportFailure } from "./notices";
import { NotePins } from "./pins/note-pins";
import { MISSING_SECRET_KEY_HINT, MissingRouteHint } from "./route/route-hint";
import { type DevRouteState, useDevRoute } from "./route/use-dev-route";

type CodeLookup =
  | { element: Element; kind: "locating"; title: string }
  | { kind: "located"; target: CodeTarget }
  | { kind: "unlocated"; title: string };

const PICKER_LABELS: FeedbackWidgetLabels = {
  ...DEFAULT_WIDGET_LABELS,
  attachElement: "Save note",
  elementNote: "Dev note",
  elementNotePlaceholder: "What should change here?",
  pickElementHint: "Pick an element to note it",
};

function titleFor(element: Element): string {
  const owner = resolveComponentStack(getFiberFromNode(element))[0];
  const label = describeElement(element);
  return owner ? `<${owner}> ${label}` : label;
}

function sendBlockedReason(route: DevRouteState): string | null {
  if (route.kind === "checking") {
    return "Connecting to the Reflet dev route…";
  }
  if (route.kind === "missing") {
    return "Add the Reflet dev route to send notes to your board.";
  }
  return route.status.hasSecretKey ? null : MISSING_SECRET_KEY_HINT;
}

function CodeTab({
  lookup,
  route,
}: {
  lookup: CodeLookup;
  route: DevRouteState;
}) {
  if (route.kind === "missing") {
    return <MissingRouteHint purpose="read your source files here" />;
  }
  if (lookup.kind === "locating" || route.kind === "checking") {
    return <p className="dt-status">Locating the source…</p>;
  }
  if (lookup.kind === "unlocated") {
    return (
      <div className="dt-empty">
        <p>{lookup.title}</p>
        <p>
          React did not record where this element was written: it comes from a
          library, or this page is a production build.
        </p>
      </div>
    );
  }
  const { request } = lookup.target;
  return (
    <CodePanel
      editor={route.status.editor}
      key={`${request.fileName}:${request.line}:${request.column}`}
      target={lookup.target}
    />
  );
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
}: {
  isWidgetOpen: boolean;
  position: NonNullable<RefletFeedbackProps["position"]>;
}) {
  const route = useDevRoute();
  const notes = useNotes();
  useResumeLocating(notes, route);
  const [isPicking, setIsPicking] = useState(false);
  const [openTab, setOpenTab] = useState<SheetTab | null>(null);
  const [codeLookup, setCodeLookup] = useState<CodeLookup | null>(null);
  const [highlighted, setHighlighted] = useState<Element | null>(null);

  const edge = position.startsWith("top") ? "top" : "bottom";
  const side = position.endsWith("right") ? "right" : "left";
  const canReadSource = route.kind === "ready";
  const isRecessed = isWidgetOpen || isPicking;

  const closeSheet = useCallback(() => {
    setOpenTab(null);
    setHighlighted(null);
  }, []);

  const startPick = useCallback(() => setIsPicking(true), []);
  const cancelPick = useCallback(() => setIsPicking(false), []);

  const openCode = useCallback((target: CodeTarget) => {
    setCodeLookup({ kind: "located", target });
    setOpenTab("code");
  }, []);

  const showSelector = useCallback((selector: string) => {
    const element = findOnPage(selector);
    setHighlighted(element);
    element?.scrollIntoView({ behavior: "smooth", block: "center" });
    return element !== null;
  }, []);

  const inspectElement = useCallback((element: Element) => {
    setIsPicking(false);
    const title = titleFor(element);
    setCodeLookup({ element, kind: "locating", title });
    setOpenTab("code");
    locateElementSource(element)
      .catch(() => null)
      .then((request) =>
        setCodeLookup((current) => {
          const isStillWanted =
            current?.kind === "locating" && current.element === element;
          if (!isStillWanted) {
            return current;
          }
          return request
            ? { kind: "located", target: { request, title } }
            : { kind: "unlocated", title };
        })
      );
  }, []);
  const inspect = useMemo(
    () => ({ label: "View code", onInspect: inspectElement }),
    [inspectElement]
  );

  const writeNote = useCallback(
    (element: Element, text: string) => {
      setIsPicking(false);
      saveNote(draftNote(element, text), element, canReadSource);
    },
    [canReadSource]
  );

  const tabs: SheetTab[] = codeLookup
    ? ["notes", "inbox", "code"]
    : ["notes", "inbox"];

  return (
    <div
      className="dt"
      data-recessed={isRecessed}
      data-sheet-open={openTab !== null}
    >
      <style>{DEVTOOLS_STYLES}</style>
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
              sendBlockedReason={sendBlockedReason(route)}
            />
          )}
          {openTab === "inbox" && route.kind === "missing" && (
            <MissingRouteHint purpose="see your board's feedback for this page" />
          )}
          {openTab === "inbox" &&
            route.kind === "ready" &&
            !route.status.hasSecretKey && (
              <p className="dt-hint">{MISSING_SECRET_KEY_HINT}</p>
            )}
          {openTab === "inbox" &&
            route.kind === "ready" &&
            route.status.hasSecretKey && (
              <InboxPanel onOpenCode={openCode} onShowSelector={showSelector} />
            )}
          {openTab === "code" && codeLookup && (
            <CodeTab lookup={codeLookup} route={route} />
          )}
        </DevtoolsSheet>
      )}
      <DevtoolsBar
        edge={edge}
        noteCount={
          notes.notes.filter((note) => isActiveNote(note) && !note.sent).length
        }
        onPick={startPick}
        onToggleSheet={(tab) =>
          setOpenTab((current) => (current === tab ? null : tab))
        }
        openTab={openTab}
        side={side}
      />
      {openTab && <SelectionOutline node={highlighted} />}
      <Notices />
      {isPicking && (
        <ElementPicker
          inspect={inspect}
          labels={PICKER_LABELS}
          onCancel={cancelPick}
          onPick={writeNote}
        />
      )}
    </div>
  );
}
