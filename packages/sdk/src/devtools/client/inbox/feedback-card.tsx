import { useState } from "react";
import type { ElementSelection } from "../../../types";
import type { CodeTarget } from "../code/use-code-lookup";
import { CopyButton } from "../copy-button";
import { boardFeedbackToPrompt } from "../notes/agent-prompt";
import type { BoardFeedback, SourceRequest } from "../route/dev-route";
import { CodeSearch } from "./code-search";

const SOURCE_LOCATION = /^(.+?):(\d+)(?::(\d+))?$/;
const QUOTED_LABEL = /"([^"]+)"/;
const SUGGESTED_SEARCH_WORDS = 6;

function sourceRequestFrom(location: string): SourceRequest | null {
  const match = SOURCE_LOCATION.exec(location);
  if (!match?.[1]) {
    return null;
  }
  return {
    column: match[3] ? Number(match[3]) : null,
    fileName: match[1],
    line: Number(match[2]),
  };
}

function suggestedSearch(selection: ElementSelection): string {
  const leadingWords = selection.text
    ?.split(" ")
    .slice(0, SUGGESTED_SEARCH_WORDS)
    .join(" ");
  return leadingWords || QUOTED_LABEL.exec(selection.label)?.[1] || "";
}

function SelectionRow({
  onOpenCode,
  onShowSelector,
  selection,
}: {
  onOpenCode?: (target: CodeTarget) => void;
  onShowSelector: (selector: string) => boolean;
  selection: ElementSelection;
}) {
  const [isSearching, setIsSearching] = useState(false);
  const [isOffPage, setIsOffPage] = useState(false);
  const request = selection.sourceLocation
    ? sourceRequestFrom(selection.sourceLocation)
    : null;
  const openSource =
    request && onOpenCode
      ? () => onOpenCode({ request, title: selection.label })
      : null;

  return (
    <div className="dt-selection dt-openable">
      <p className="dt-meta">
        <button
          className="dt-open"
          onClick={() => setIsOffPage(!onShowSelector(selection.selector))}
          title="Show on page"
          type="button"
        >
          <strong>{selection.label}</strong>
          {selection.region && ` · ${selection.region}`}
        </button>
      </p>
      {selection.comment && <p className="dt-note-text">{selection.comment}</p>}
      {selection.sourceLocation && openSource && (
        <button className="dt-source" onClick={openSource} type="button">
          {selection.sourceLocation}
        </button>
      )}
      {selection.sourceLocation && !onOpenCode && (
        <p className="dt-meta">{selection.sourceLocation}</p>
      )}
      {onOpenCode && !(request || isSearching) && (
        <div className="dt-actions">
          <button
            className="dt-btn"
            onClick={() => setIsSearching(true)}
            type="button"
          >
            Find in code
          </button>
        </div>
      )}
      {isOffPage && (
        <p className="dt-meta">
          This element is not on the page right now. Open the state the reporter
          was in, then try again.
        </p>
      )}
      {isSearching && onOpenCode && (
        <CodeSearch
          initialQuery={suggestedSearch(selection)}
          onOpenMatch={(match) =>
            onOpenCode({
              request: {
                column: null,
                fileName: match.absolutePath,
                line: match.line,
              },
              title: selection.label,
            })
          }
        />
      )}
    </div>
  );
}

export function FeedbackCard({
  item,
  onOpenCode,
  onShowSelector,
}: {
  item: BoardFeedback;
  onOpenCode?: (target: CodeTarget) => void;
  onShowSelector: (selector: string) => boolean;
}) {
  const selections = item.context?.selections ?? [];
  return (
    <article className="dt-card">
      <div className="dt-card-head">
        <h3 className="dt-card-title">{item.title}</h3>
        {item.isInternal && (
          <span className="dt-chip" data-tone="accent">
            Internal
          </span>
        )}
        <span className="dt-chip">
          {item.organizationStatus?.name ?? item.status}
        </span>
      </div>
      <p className="dt-meta">
        {item.voteCount} {item.voteCount === 1 ? "vote" : "votes"} ·{" "}
        {new Date(item.createdAt).toLocaleDateString()}
      </p>
      {item.description && item.description !== item.title && (
        <p className="dt-note-text">{item.description}</p>
      )}
      {selections.map((selection) => (
        <SelectionRow
          key={selection.selector}
          onOpenCode={onOpenCode}
          onShowSelector={onShowSelector}
          selection={selection}
        />
      ))}
      <div className="dt-actions">
        <CopyButton label="Copy as prompt" text={boardFeedbackToPrompt(item)} />
      </div>
    </article>
  );
}
