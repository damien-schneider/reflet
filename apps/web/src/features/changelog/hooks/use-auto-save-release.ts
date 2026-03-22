import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

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
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstEditRef = useRef(true);

  const hasContent = title.trim() || version.trim() || description.trim();

  const autoSave = useCallback(async () => {
    if (!hasContent) {
      return;
    }

    setSaveStatus("saving");

    try {
      if (releaseId) {
        await updateRelease({
          id: releaseId,
          title: title.trim() || "Untitled Release",
          version: version.trim() || undefined,
          description: description.trim() || undefined,
        });
      } else {
        const newId = await createRelease({
          organizationId,
          title: title.trim() || "Untitled Release",
          version: version.trim() || undefined,
          description: description.trim() || undefined,
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
  }, [
    hasContent,
    releaseId,
    title,
    version,
    description,
    organizationId,
    createRelease,
    updateRelease,
  ]);

  useEffect(() => {
    if (isFirstEditRef.current) {
      isFirstEditRef.current = false;
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (hasContent) {
      debounceTimerRef.current = setTimeout(() => {
        autoSave();
      }, AUTO_SAVE_DEBOUNCE_MS);
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [hasContent, autoSave]);

  return { releaseId, saveStatus };
}
