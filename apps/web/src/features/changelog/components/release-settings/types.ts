import type { api } from "@reflet/backend/convex/_generated/api";
import type { FunctionArgs } from "convex/server";

export type ChangelogSettings = NonNullable<
  FunctionArgs<typeof api.organizations.mutations.update>["changelogSettings"]
>;

export type VersionIncrement = NonNullable<
  ChangelogSettings["versionIncrement"]
>;

export type ChangelogSettingsUpdate = (
  updates: ChangelogSettings
) => Promise<void>;
