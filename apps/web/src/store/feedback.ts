import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { atom } from "jotai";
import type { SortOption } from "../lib/constants";

export const feedbackSearchAtom = atom<string>("");
export const feedbackSortAtom = atom<SortOption>("most_votes");
export const selectedStatusIdsAtom = atom<Id<"organizationStatuses">[]>([]);
export const selectedTagIdsAtom = atom<Id<"tags">[]>([]);
export const hideCompletedAtom = atom<boolean>(true);
