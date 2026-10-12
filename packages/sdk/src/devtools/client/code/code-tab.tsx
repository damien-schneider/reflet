import { useCallback, useState } from "react";
import { describeElement } from "../../../feedback/core/element-selector";
import {
  getFiberFromNode,
  resolveComponentStack,
} from "../../../feedback/core/react-source";
import { locateElementSource } from "../element-source";
import { MissingRouteHint } from "../route/route-hint";
import type { DevRouteState } from "../route/use-dev-route";
import { CodePanel, type CodeTarget } from "./code-panel";

export type CodeLookup =
  | { element: Element; kind: "locating"; title: string }
  | { kind: "located"; target: CodeTarget }
  | { kind: "unlocated"; title: string };

export function titleFor(element: Element): string {
  const owner = resolveComponentStack(getFiberFromNode(element))[0];
  const label = describeElement(element);
  return owner ? `<${owner}> ${label}` : label;
}

export function useCodeLookup(showCodeTab: (tab: "code") => void) {
  const [codeLookup, setCodeLookup] = useState<CodeLookup | null>(null);

  const openCode = useCallback(
    (target: CodeTarget) => {
      setCodeLookup({ kind: "located", target });
      showCodeTab("code");
    },
    [showCodeTab]
  );

  const inspectElement = useCallback(
    (element: Element) => {
      const title = titleFor(element);
      setCodeLookup({ element, kind: "locating", title });
      showCodeTab("code");
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
    },
    [showCodeTab]
  );

  return { codeLookup, inspectElement, openCode };
}

export function CodeTab({
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
