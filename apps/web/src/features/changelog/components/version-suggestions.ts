import type { api } from "@reflet/backend/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";

export type VersionSuggestions =
  | FunctionReturnType<typeof api.changelog.queries.getNextVersion>
  | undefined;

export function getSuggestedVersion(
  versionSuggestions: VersionSuggestions
): string {
  if (!versionSuggestions || versionSuggestions.autoVersioning === false) {
    return "";
  }
  return (
    versionSuggestions[versionSuggestions.defaultIncrement ?? "patch"] ?? ""
  );
}
