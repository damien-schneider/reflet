import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";
import type { CommitInfo, FileInfo } from "../components/generate-from-commits";

export function useReleaseCommits(releaseId: Id<"releases"> | null) {
  const saveReleaseCommits = useMutation(
    api.changelog.release_commits.saveReleaseCommits
  );

  const [fetched, setFetched] = useState<{
    commits: CommitInfo[];
    files: FileInfo[] | undefined;
    previousTag: string | undefined;
  } | null>(null);
  const hasSavedRef = useRef(false);

  const persistedCommits = useQuery(
    api.changelog.release_commits.getReleaseCommits,
    releaseId ? { releaseId } : "skip"
  );

  const hasFetchedCommits = (fetched?.commits.length ?? 0) > 0;
  const commits =
    (hasFetchedCommits ? fetched?.commits : persistedCommits?.commits) ?? [];
  const files = hasFetchedCommits
    ? fetched?.files
    : (persistedCommits?.files ?? undefined);
  const previousTag = hasFetchedCommits
    ? fetched?.previousTag
    : (persistedCommits?.previousTag ?? undefined);

  useEffect(() => {
    if (
      releaseId &&
      fetched &&
      fetched.commits.length > 0 &&
      !hasSavedRef.current
    ) {
      hasSavedRef.current = true;
      saveReleaseCommits({ ...fetched, releaseId }).catch(() => {
        hasSavedRef.current = false;
      });
    }
  }, [releaseId, fetched, saveReleaseCommits]);

  const handleCommitsFetched = (
    fetchedCommits: CommitInfo[],
    fetchedFiles: FileInfo[] | undefined,
    fetchedPreviousTag: string | null
  ) => {
    hasSavedRef.current = false;
    setFetched({
      commits: fetchedCommits,
      files: fetchedFiles,
      previousTag: fetchedPreviousTag ?? undefined,
    });

    if (releaseId) {
      hasSavedRef.current = true;
      saveReleaseCommits({
        commits: fetchedCommits,
        files: fetchedFiles,
        previousTag: fetchedPreviousTag ?? undefined,
        releaseId,
      }).catch(() => {
        hasSavedRef.current = false;
      });
    }
  };

  return { commits, files, handleCommitsFetched, previousTag };
}
