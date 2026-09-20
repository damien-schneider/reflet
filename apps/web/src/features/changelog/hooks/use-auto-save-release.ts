import { toast } from "@ctrl-ui/react/ui/toast";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useEffect, useRef, useState } from "react";

type SaveStatus = "idle" | "saving" | "saved";

const AUTO_SAVE_DEBOUNCE_MS = 500;
const SAVED_DISPLAY_MS = 2000;

interface UseAutoSaveReleaseOptions {
  description: string;
  initialReleaseId: Id<"releases"> | null;
  organizationId: Id<"organizations">;
  title: string;
  version: string;
}

interface ReleaseDraft {
  description: string;
  title: string;
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

  const autoSave = async (draft: ReleaseDraft) => {
    setSaveStatus("saving");

    try {
      if (releaseId) {
        await updateRelease({
          description: draft.description || undefined,
          id: releaseId,
          title: draft.title || "Untitled Release",
          version: draft.version || undefined,
        });
      } else {
        const newId = await createRelease({
          description: draft.description || undefined,
          organizationId,
          title: draft.title || "Untitled Release",
          version: draft.version || undefined,
        });
        setReleaseId(newId);
      }
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), SAVED_DISPLAY_MS);
    } catch (error) {
      setSaveStatus("idle");
      toast.error(
        error instanceof Error ? error.message : "Failed to save draft"
      );
    }
  };

  const autoSaveRef = useRef(autoSave);
  autoSaveRef.current = autoSave;

  useEffect(() => {
    if (isFirstEditRef.current) {
      isFirstEditRef.current = false;
      return;
    }

    const draft: ReleaseDraft = {
      description: description.trim(),
      title: title.trim(),
      version: version.trim(),
    };

    if (!(draft.title || draft.version || draft.description)) {
      return;
    }

    const timer = setTimeout(
      () => autoSaveRef.current(draft),
      AUTO_SAVE_DEBOUNCE_MS
    );

    return () => clearTimeout(timer);
  }, [description, title, version]);

  return { releaseId, saveStatus };
}
