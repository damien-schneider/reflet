import { toast } from "@ctrl-ui/react/ui/toast";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Doc, Id } from "@reflet/backend/convex/_generated/dataModel";
import { UNTITLED_RELEASE_TITLE } from "@reflet/backend/convex/changelog/release_text";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useEffectEvent, useRef, useState } from "react";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

const AUTO_SAVE_DEBOUNCE_MS = 500;
const SAVED_DISPLAY_MS = 2000;

const RELEASE_TEXT_FIELDS = ["description", "title", "version"] as const;
type ReleaseTextField = (typeof RELEASE_TEXT_FIELDS)[number];

interface FieldEdit {
  saved: boolean;
  value: string;
}

type FieldEdits = Partial<Record<ReleaseTextField, FieldEdit>>;

interface ReleaseCreation {
  id: Id<"releases">;
  sent: Record<ReleaseTextField, string>;
}

interface UseAutoSaveReleaseOptions {
  initialRelease: Doc<"releases"> | undefined;
  organizationId: Id<"organizations">;
  suggestedVersion: string;
}

function storedTitle(title: string) {
  return title.trim() ? title : UNTITLED_RELEASE_TITLE;
}

function storedDescription(description: string) {
  return description.trim() ? description : "";
}

export function useAutoSaveRelease({
  initialRelease,
  organizationId,
  suggestedVersion,
}: UseAutoSaveReleaseOptions) {
  const createRelease = useMutation(api.changelog.mutations.create);
  const updateRelease = useMutation(api.changelog.mutations.update);

  const [createdReleaseId, setCreatedReleaseId] =
    useState<Id<"releases"> | null>(null);
  const releaseId = initialRelease?._id ?? createdReleaseId;
  const liveRelease = useQuery(
    api.changelog.queries.get,
    releaseId ? { id: releaseId } : "skip"
  );
  const release = liveRelease ?? initialRelease;

  const [edits, setEdits] = useState<FieldEdits>({});
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const pendingCreation = useRef<Promise<ReleaseCreation> | null>(null);

  const fieldValue = (field: ReleaseTextField, serverValue: string) => {
    const edit = edits[field];
    const adoptsServer = !edit || (edit.saved && release !== undefined);
    return adoptsServer ? serverValue : edit.value;
  };

  const serverTitle =
    release?.title === UNTITLED_RELEASE_TITLE ? "" : (release?.title ?? "");
  const title = fieldValue("title", serverTitle);
  const description = fieldValue("description", release?.description ?? "");
  const version = fieldValue("version", release?.version ?? suggestedVersion);

  const editField = (field: ReleaseTextField) => (value: string) =>
    setEdits((current) => ({ ...current, [field]: { saved: false, value } }));

  const startCreation = async (): Promise<ReleaseCreation> => {
    const sent = { description, title, version };
    const id = await createRelease({
      description: storedDescription(description) || undefined,
      organizationId,
      title: storedTitle(title),
      version: version.trim() || undefined,
    });
    setCreatedReleaseId(id);
    return { id, sent };
  };

  const writeEdits = async (id: Id<"releases">, written: FieldEdits) => {
    if (Object.keys(written).length === 0) {
      return;
    }
    await updateRelease({
      description:
        written.description && storedDescription(written.description.value),
      id,
      title: written.title && storedTitle(written.title.value),
      version: written.version?.value.trim() || undefined,
    });
  };

  const joinCreation = async (
    creation: Promise<ReleaseCreation>,
    unsaved: FieldEdits
  ) => {
    const { id, sent } = await creation;
    const notYetWritten: FieldEdits = {};
    for (const field of RELEASE_TEXT_FIELDS) {
      const edit = unsaved[field];
      if (edit && edit.value !== sent[field]) {
        notYetWritten[field] = edit;
      }
    }
    await writeEdits(id, notYetWritten);
    return id;
  };

  const createOnce = async () => {
    const creation = startCreation();
    pendingCreation.current = creation;
    try {
      return (await creation).id;
    } catch (error) {
      pendingCreation.current = null;
      throw error;
    }
  };

  const saveRelease = async (): Promise<Id<"releases">> => {
    const unsaved: FieldEdits = {};
    for (const field of RELEASE_TEXT_FIELDS) {
      const edit = edits[field];
      if (edit && !edit.saved) {
        unsaved[field] = edit;
      }
    }
    if (releaseId && Object.keys(unsaved).length === 0) {
      return releaseId;
    }
    setSaveStatus("saving");
    try {
      let id = releaseId;
      if (id) {
        await writeEdits(id, unsaved);
      } else if (pendingCreation.current) {
        id = await joinCreation(pendingCreation.current, unsaved);
      } else {
        id = await createOnce();
      }
      setEdits((current) => {
        const next = { ...current };
        for (const field of RELEASE_TEXT_FIELDS) {
          const written = unsaved[field];
          if (written && next[field]?.value === written.value) {
            next[field] = { saved: true, value: written.value };
          }
        }
        return next;
      });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), SAVED_DISPLAY_MS);
      return id;
    } catch (error) {
      setSaveStatus("error");
      throw error;
    }
  };

  const autoSave = useEffectEvent(() => {
    const hasContent = Boolean(
      title.trim() || description.trim() || edits.version?.value.trim()
    );
    if (!(releaseId || hasContent)) {
      return;
    }
    saveRelease().catch((error: unknown) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to save the draft. Check your connection."
      );
    });
  });

  useEffect(() => {
    const hasUnsavedEdit = Object.values(edits).some((edit) => !edit.saved);
    if (!hasUnsavedEdit) {
      return;
    }
    const timer = setTimeout(autoSave, AUTO_SAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [edits]);

  const discardProseEdits = () =>
    setEdits(({ version: versionEdit }) =>
      versionEdit ? { version: versionEdit } : {}
    );

  return {
    description,
    discardProseEdits,
    release,
    releaseId,
    saveRelease,
    saveStatus,
    setDescription: editField("description"),
    setTitle: editField("title"),
    setVersion: editField("version"),
    title,
    version,
  };
}
