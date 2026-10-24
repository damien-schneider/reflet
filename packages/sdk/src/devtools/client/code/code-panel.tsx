import { useEffect, useRef, useState } from "react";
import type { EditorId, LineRange, SourceFile } from "../../protocol";
import { CopyButton } from "../copy-button";
import { fetchSourceFile, type SourceRequest } from "../route/dev-route";
import { editorUrl } from "./editor-url";

type SourceState =
  | { kind: "failed"; message: string; request: SourceRequest }
  | { kind: "loading" }
  | { file: SourceFile; kind: "ready" };

function markedRange(file: SourceFile): LineRange | null {
  if (file.elementLines) {
    return file.elementLines;
  }
  return file.line === null ? null : { end: file.line, start: file.line };
}

function SourceView({ file }: { file: SourceFile }) {
  const firstMarkedRef = useRef<HTMLSpanElement>(null);
  const marked = markedRange(file);
  const lines = file.code
    .split("\n")
    .map((text, index) => ({ number: index + 1, text }));

  useEffect(() => {
    firstMarkedRef.current?.scrollIntoView({ block: "center" });
  }, []);

  return (
    <pre className="dt-code">
      <code className="dt-code-lines">
        {lines.map(({ number, text }) => {
          const isMarked =
            marked !== null && number >= marked.start && number <= marked.end;
          return (
            <span
              className="dt-line"
              data-marked={isMarked}
              key={number}
              ref={number === marked?.start ? firstMarkedRef : undefined}
            >
              <span className="dt-line-number">{number}</span>
              <span>{text || " "}</span>
            </span>
          );
        })}
      </code>
    </pre>
  );
}

export function CodePanel({
  editor,
  request,
}: {
  editor: EditorId;
  request: SourceRequest;
}) {
  const [state, setState] = useState<SourceState>({ kind: "loading" });

  // No reset per request: the last file stays up until the next one lands.
  useEffect(() => {
    let active = true;
    fetchSourceFile(request)
      .then((file) => active && setState({ file, kind: "ready" }))
      .catch(
        (error: unknown) =>
          active &&
          setState({
            kind: "failed",
            message:
              error instanceof Error
                ? error.message
                : "Could not read the file.",
            request,
          })
      );
    return () => {
      active = false;
    };
  }, [request]);

  if (state.kind === "loading") {
    return <p className="dt-status">Opening {request.fileName}…</p>;
  }
  if (state.kind === "failed") {
    return (
      <>
        <p className="dt-code-path">{state.request.fileName}</p>
        <p className="dt-error">{state.message}</p>
      </>
    );
  }

  const { file } = state;
  const location = file.line === null ? file.path : `${file.path}:${file.line}`;
  return (
    <>
      <div className="dt-code-head">
        <p className="dt-code-path">{location}</p>
        <div className="dt-actions">
          <a
            className="dt-btn"
            data-variant="primary"
            href={editorUrl(editor, file.absolutePath, file.line, file.column)}
          >
            Open in editor
          </a>
          <CopyButton label="Copy path" text={location} />
        </div>
      </div>
      <SourceView
        file={file}
        key={`${file.path}:${file.line}:${file.column}`}
      />
    </>
  );
}
