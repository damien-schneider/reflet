import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CommitInfo, FileInfo } from "../components/generate-from-commits";

export function useReleaseCommits(releaseId: Id<"releases"> | null) {
  const saveReleaseCommits = useMutation(
    api.changelog_actions.saveReleaseCommits
  );

  const [commits, setCommits] = useState<CommitInfo[]>([]);
  const [files, setFiles] = useState<FileInfo[] | undefined>(undefined);
  const [previousTag, setPreviousTag] = useState<string | undefined>(undefined);
  const hasSavedRef = useRef(false);

  const persistedCommits = useQuery(
    api.changelog_actions.getReleaseCommits,
    releaseId ? { releaseId } : "skip"
  );

  // Sync persisted commits into local state on initial load
  useEffect(() => {
    if (persistedCommits && commits.length === 0) {
      setCommits(persistedCommits.commits);
      setFiles(persistedCommits.files ?? undefined);
      setPreviousTag(persistedCommits.previousTag ?? undefined);
    }
  }, [persistedCommits, commits.length]);

  // Save unsaved commits when releaseId becomes available (handles race condition
  // where commits are fetched before auto-save creates the release)
  useEffect(() => {
    if (releaseId && commits.length > 0 && !hasSavedRef.current) {
      hasSavedRef.current = true;
      saveReleaseCommits({
        releaseId,
        commits,
        files,
        previousTag,
      }).catch(() => {
        hasSavedRef.current = false;
      });
    }
  }, [releaseId, commits, files, previousTag, saveReleaseCommits]);

  const handleCommitsFetched = useCallback(
    (
      fetchedCommits: CommitInfo[],
      fetchedFiles: FileInfo[] | undefined,
      fetchedPreviousTag: string | null
    ) => {
      hasSavedRef.current = false;
      setCommits(fetchedCommits);
      setFiles(fetchedFiles);
      setPreviousTag(fetchedPreviousTag ?? undefined);

      if (releaseId) {
        hasSavedRef.current = true;
        saveReleaseCommits({
          releaseId,
          commits: fetchedCommits,
          files: fetchedFiles,
          previousTag: fetchedPreviousTag ?? undefined,
        }).catch(() => {
          hasSavedRef.current = false;
        });
      }
    },
    [releaseId, saveReleaseCommits]
  );

  return { commits, files, previousTag, handleCommitsFetched };
}
