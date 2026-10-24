import { shortenSourcePath } from "../../../feedback/core/react-source";
import type { CodeFrame } from "../element-source";
import { MissingRouteHint } from "../route/route-hint";
import type { DevRouteState } from "../route/use-dev-route";
import { CodePanel } from "./code-panel";
import {
  type CodeLookup,
  type LocatedCode,
  locationKey,
} from "./use-code-lookup";

const PATH_SEPARATOR = /[\\/]/;

function frameLabel({ component, request }: CodeFrame): string {
  return component ?? request.fileName.split(PATH_SEPARATOR).at(-1) ?? "";
}

/** Outermost component first, like a breadcrumb; each step opens where that component writes the element. */
function ComponentPath({
  code,
  onSelectFrame,
}: {
  code: LocatedCode;
  onSelectFrame: (index: number) => void;
}) {
  const outermostFirst = code.trail
    .map((frame, index) => ({ frame, index }))
    .reverse();
  return (
    <nav aria-label="Component path" className="dt-trail">
      <ol>
        {outermostFirst.map(({ frame, index }) => {
          const path = shortenSourcePath(frame.request.fileName);
          return (
            <li key={locationKey(frame.request)}>
              <button
                aria-current={index === code.selected ? "location" : undefined}
                className="dt-crumb"
                onClick={() => onSelectFrame(index)}
                title={
                  frame.request.line === null
                    ? path
                    : `${path}:${frame.request.line}`
                }
                type="button"
              >
                {frameLabel(frame)}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function CodeTab({
  lookup,
  onSelectFrame,
  route,
}: {
  lookup: CodeLookup;
  onSelectFrame: (index: number) => void;
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
  return (
    <>
      <div className="dt-code-head">
        <p className="dt-card-title">{lookup.title}</p>
        {lookup.trail.length > 1 && (
          <ComponentPath code={lookup} onSelectFrame={onSelectFrame} />
        )}
      </div>
      <CodePanel
        editor={route.status.editor}
        request={lookup.trail[lookup.selected].request}
      />
    </>
  );
}
