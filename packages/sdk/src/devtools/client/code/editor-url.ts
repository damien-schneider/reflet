import type { EditorId } from "../../protocol";

type EditorLink = (
  absolutePath: string,
  line: number,
  column: number
) => string;

/** VS Code-family links want `/c:/dir/file.tsx` on Windows, `/dir/file.tsx` elsewhere. */
const fileSchemeLink =
  (scheme: string): EditorLink =>
  (absolutePath, line, column) => {
    const slashed = absolutePath.replaceAll("\\", "/");
    const rooted = slashed.startsWith("/") ? slashed : `/${slashed}`;
    return `${scheme}://file${encodeURI(rooted)}:${line}:${column}`;
  };

const EDITOR_LINKS: Record<EditorId, EditorLink> = {
  cursor: fileSchemeLink("cursor"),
  vscode: fileSchemeLink("vscode"),
  webstorm: (absolutePath, line, column) =>
    `webstorm://open?${new URLSearchParams({
      column: String(column),
      file: absolutePath,
      line: String(line),
    })}`,
  windsurf: fileSchemeLink("windsurf"),
  zed: fileSchemeLink("zed"),
};

export function editorUrl(
  editor: EditorId,
  absolutePath: string,
  line: number | null,
  column: number | null
): string {
  return EDITOR_LINKS[editor](absolutePath, line ?? 1, (column ?? 0) + 1);
}
