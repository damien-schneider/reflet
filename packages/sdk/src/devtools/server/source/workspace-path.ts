import { isAbsolute, relative, sep } from "node:path";

/** Forward-slash path from the workspace root, or null when `realPath` escapes it (including another Windows drive). */
export function workspaceRelativePath(
  realPath: string,
  workspaceRoot: string
): string | null {
  const relativePath = relative(workspaceRoot, realPath);
  const escapes =
    relativePath === "" ||
    relativePath === ".." ||
    relativePath.startsWith(`..${sep}`) ||
    isAbsolute(relativePath);
  return escapes ? null : relativePath.split(sep).join("/");
}
