import type { Doc } from "../../_generated/dataModel";

export function categoryIsPublic(tag: Pick<Doc<"tags">, "settings">) {
  return tag.settings?.isPublic === true;
}
