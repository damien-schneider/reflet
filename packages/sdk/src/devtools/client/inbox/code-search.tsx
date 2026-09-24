import { useState } from "react";
import type { CodeMatch } from "../../protocol";
import { searchCode } from "../route/dev-route";

type SearchState =
  | { kind: "done"; matches: CodeMatch[] }
  | { kind: "failed"; message: string }
  | { kind: "idle" }
  | { kind: "searching" };

export function CodeSearch({
  initialQuery,
  onOpenMatch,
}: {
  initialQuery: string;
  onOpenMatch: (match: CodeMatch) => void;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [state, setState] = useState<SearchState>({ kind: "idle" });

  const search = async () => {
    setState({ kind: "searching" });
    try {
      const { matches } = await searchCode(query.trim());
      setState({ kind: "done", matches });
    } catch (error) {
      setState({
        kind: "failed",
        message: error instanceof Error ? error.message : "Search failed.",
      });
    }
  };

  return (
    <>
      <form
        className="dt-search"
        onSubmit={(event) => {
          event.preventDefault();
          search();
        }}
      >
        <input
          aria-label="Text to find in the code"
          className="dt-field"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Text shown by the element"
          value={query}
        />
        <button
          className="dt-btn"
          disabled={query.trim().length < 2 || state.kind === "searching"}
          type="submit"
        >
          Find in code
        </button>
      </form>
      {state.kind === "failed" && <p className="dt-error">{state.message}</p>}
      {state.kind === "done" && state.matches.length === 0 && (
        <p className="dt-meta">No file contains this text.</p>
      )}
      {state.kind === "done" && state.matches.length > 0 && (
        <ul className="dt-matches">
          {state.matches.map((match) => (
            <li key={`${match.path}:${match.line}`}>
              <button
                className="dt-match"
                onClick={() => onOpenMatch(match)}
                type="button"
              >
                <code>
                  {match.path}:{match.line}
                </code>
                <span>{match.preview}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
