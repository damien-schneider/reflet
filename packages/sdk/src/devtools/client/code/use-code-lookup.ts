import { useCallback, useRef, useState } from "react";
import { describeElement } from "../../../feedback/core/element-selector";
import {
  getFiberFromNode,
  resolveComponentStack,
} from "../../../feedback/core/react-source";
import { isServerFrame } from "../../protocol";
import { type CodeFrame, traceElementSource } from "../element-source";
import { fetchSourceFile, type SourceRequest } from "../route/dev-route";

export interface CodeTarget {
  request: SourceRequest;
  title: string;
}

export type CodeLookup =
  | { element: Element; kind: "locating"; title: string }
  | { kind: "located"; selected: number; title: string; trail: CodeFrame[] }
  | { kind: "unlocated"; title: string };

export type LocatedCode = Extract<CodeLookup, { kind: "located" }>;

export function titleFor(element: Element): string {
  const owner = resolveComponentStack(getFiberFromNode(element))[0];
  const label = describeElement(element);
  return owner ? `<${owner}> ${label}` : label;
}

export function locationKey({ column, fileName, line }: SourceRequest) {
  return `${fileName}:${line}:${column}`;
}

/** What the code on screen draws on the page, to outline it there. */
export function inspectedNode(lookup: CodeLookup | null): Element | null {
  if (lookup?.kind === "locating") {
    return lookup.element;
  }
  return lookup?.kind === "located" ? lookup.trail[lookup.selected].node : null;
}

/** The route maps server frames to the file they come from, and refuses library code. */
async function readableFrame(frame: CodeFrame): Promise<CodeFrame | null> {
  if (!isServerFrame(frame.request.fileName)) {
    return frame;
  }
  const file = await fetchSourceFile(frame.request).catch(() => null);
  return (
    file && {
      ...frame,
      request: {
        column: file.column,
        fileName: file.absolutePath,
        line: file.line,
      },
    }
  );
}

async function followTrail(
  element: Element,
  trail: { isCurrent: () => boolean; onFrame: (frame: CodeFrame) => void }
) {
  for await (const frame of traceElementSource(element)) {
    const readable = await readableFrame(frame);
    if (!trail.isCurrent()) {
      return;
    }
    if (readable) {
      trail.onFrame(readable);
    }
  }
}

function withFrame(
  current: CodeLookup | null,
  frame: CodeFrame
): CodeLookup | null {
  if (current?.kind === "locating") {
    return {
      kind: "located",
      selected: 0,
      title: current.title,
      trail: [frame],
    };
  }
  if (current?.kind !== "located") {
    return current;
  }
  const location = locationKey(frame.request);
  const isKnown = current.trail.some(
    (known) => locationKey(known.request) === location
  );
  return isKnown ? current : { ...current, trail: [...current.trail, frame] };
}

export function useCodeLookup(showCodeTab: (tab: "code") => void) {
  const [codeLookup, setCodeLookup] = useState<CodeLookup | null>(null);
  const latestLookup = useRef(0);

  const openCode = useCallback(
    (target: CodeTarget) => {
      latestLookup.current += 1;
      const frame = { component: null, node: null, request: target.request };
      setCodeLookup({
        kind: "located",
        selected: 0,
        title: target.title,
        trail: [frame],
      });
      showCodeTab("code");
    },
    [showCodeTab]
  );

  const inspectElement = useCallback(
    (element: Element) => {
      latestLookup.current += 1;
      const lookup = latestLookup.current;
      const isCurrent = () => lookup === latestLookup.current;
      const title = titleFor(element);
      setCodeLookup({ element, kind: "locating", title });
      showCodeTab("code");
      followTrail(element, {
        isCurrent,
        onFrame: (frame) =>
          setCodeLookup((current) => withFrame(current, frame)),
      })
        .catch(() => null)
        .then(() => {
          if (isCurrent()) {
            setCodeLookup((current) =>
              current?.kind === "locating"
                ? { kind: "unlocated", title }
                : current
            );
          }
        });
    },
    [showCodeTab]
  );

  const selectFrame = useCallback(
    (index: number) =>
      setCodeLookup((current) =>
        current?.kind === "located" ? { ...current, selected: index } : current
      ),
    []
  );

  return { codeLookup, inspectElement, openCode, selectFrame };
}
