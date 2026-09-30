import { toast } from "@ctrl-ui/react/ui/toast";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useEffect, useEffectEvent, useRef, useState } from "react";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

const AUTO_SAVE_DEBOUNCE_MS = 500;
const SAVED_DISPLAY_MS = 2000;
export const UNTITLED_RELEASE_TITLE = "Untitled release";

interface UseAutoSaveReleaseOptions {
  description: string;
  initialReleaseId: Id<"releases"> | null;
  organizationId: Id<"organizations">;
  title: string;
  userVersion: string | null;
  version: string;
}

interface UseAutoSaveReleaseResult {
  releaseId: Id<"releases"> | null;
  saveStatus: SaveStatus;
}

export function useAutoSaveRelease({
  organizationId,
  initialReleaseId,
  title,
  userVersion,
  version,
  description,
}: UseAutoSaveReleaseOptions): UseAutoSaveReleaseResult {
  const createRelease = useMutation(api.changelog.mutations.create);
  const updateRelease = useMutation(api.changelog.mutations.update);

  const [releaseId, setReleaseId] = useState<Id<"releases"> | null>(
    initialReleaseId
  );
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const isFirstEditRef = useRef(true);

  const autoSave = useEffectEvent(async () => {
    setSaveStatus("saving");
    const draft = {
      description: description.trim() || undefined,
      title: title.trim() || UNTITLED_RELEASE_TITLE,
      version: version.trim() || undefined,
    };

    try {
      if (releaseId) {
        await updateRelease({ ...draft, id: releaseId });
      } else {
        const newId = await createRelease({ ...draft, organizationId });
        setReleaseId(newId);
      }
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), SAVED_DISPLAY_MS);
    } catch (error) {
      setSaveStatus("error");
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to save the draft. Check your connection."
      );
    }
  });

  useEffect(() => {
    if (isFirstEditRef.current) {
      isFirstEditRef.current = false;
      return;
    }

    const hasUserContent = Boolean(
      title.trim() || description.trim() || userVersion?.trim()
    );
    if (!hasUserContent) {
      return;
    }

    const timer = setTimeout(() => autoSave(), AUTO_SAVE_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [description, title, userVersion]);

  return { releaseId, saveStatus };
}
