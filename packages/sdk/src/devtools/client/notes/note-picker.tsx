import { useCallback, useMemo } from "react";
import {
  DEFAULT_WIDGET_LABELS,
  type FeedbackWidgetLabels,
} from "../../../feedback/types";
import { ElementPicker, type PickerInspect } from "../../../feedback/ui/picker";
import { copyToClipboard } from "../clipboard";
import { titleFor } from "../code/code-tab";
import { announce, reportFailure } from "../notices";
import { noteAsContext } from "./agent-prompt";
import { draftLocatedNote, draftNote, enrichNote } from "./capture-note";
import { type DevNote, noteStore } from "./note-store";

const PICKER_LABELS: FeedbackWidgetLabels = {
  ...DEFAULT_WIDGET_LABELS,
  attachElement: "Save note",
  elementNote: "Dev note",
  elementNotePlaceholder: "What should change here?",
  pickElementHint: "Pick an element to note or copy it",
};

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

export function NotePicker({
  canReadSource,
  inspect,
  onDone,
}: {
  canReadSource: boolean;
  inspect?: PickerInspect;
  onDone: () => void;
}) {
  const writeNote = useCallback(
    (element: Element, text: string) => {
      onDone();
      saveNote(draftNote(element, text), element, canReadSource);
    },
    [canReadSource, onDone]
  );

  const copy = useMemo(
    () => ({
      label: "Copy",
      onCopy: (element: Element, text: string) => {
        onDone();
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
    [canReadSource, onDone]
  );

  return (
    <ElementPicker
      copy={copy}
      inspect={inspect}
      labels={PICKER_LABELS}
      onCancel={onDone}
      onPick={writeNote}
    />
  );
}
