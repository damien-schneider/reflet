import type { LivePlace } from "../protocol";
import type { HubActivity } from "./hub-link/use-hub-stream";

const OUTSIDE: LivePlace = { kind: "outside", lastApp: null };

export function placeOfFocus({ apps, focus }: HubActivity): LivePlace {
  if (!focus) {
    return OUTSIDE;
  }
  const app = apps.find((candidate) => candidate.id === focus.appId);
  return app ? { app, kind: "app", page: focus.page } : OUTSIDE;
}
