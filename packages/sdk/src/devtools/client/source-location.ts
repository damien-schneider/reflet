import { shortenSourcePath } from "../../feedback/core/react-source";
import { fetchSourceFile, type SourceRequest } from "./route/dev-route";

/** `file:line:column` with a 1-based column, the way editors and agents read it. */
function withPosition(
  path: string,
  position: { column: number | null; line: number | null }
): string {
  if (position.line === null) {
    return path;
  }
  return position.column === null
    ? `${path}:${position.line}`
    : `${path}:${position.line}:${position.column + 1}`;
}

/** Repository-relative when the dev route can resolve it, so agents find the file as-is. */
export async function describeSource(
  source: SourceRequest,
  canReadSource: boolean
): Promise<string> {
  if (canReadSource) {
    const file = await fetchSourceFile(source).catch(() => null);
    if (file) {
      return withPosition(file.path, file);
    }
  }
  return withPosition(shortenSourcePath(source.fileName), source);
}
