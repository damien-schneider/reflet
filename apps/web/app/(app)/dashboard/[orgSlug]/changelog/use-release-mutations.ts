import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import type { OptimisticLocalStore } from "convex/browser";
import { useMutation } from "convex/react";
import type { FunctionReturnType } from "convex/server";

type ReleaseList = FunctionReturnType<typeof api.changelog.queries.list>;

function updateReleaseList(
  localStore: OptimisticLocalStore,
  organizationId: Id<"organizations"> | undefined,
  update: (releases: ReleaseList) => ReleaseList
) {
  if (!organizationId) {
    return;
  }
  const current = localStore.getQuery(api.changelog.queries.list, {
    organizationId,
  });
  if (!current) {
    return;
  }
  localStore.setQuery(
    api.changelog.queries.list,
    { organizationId },
    update(current)
  );
}

export function useReleaseMutations(
  organizationId: Id<"organizations"> | undefined
) {
  const deleteRelease = useMutation(
    api.changelog.actions.remove
  ).withOptimisticUpdate((localStore, args) =>
    updateReleaseList(localStore, organizationId, (releases) =>
      releases.filter((r) => r._id !== args.id)
    )
  );

  const publishRelease = useMutation(
    api.changelog.actions.publish
  ).withOptimisticUpdate((localStore, args) =>
    updateReleaseList(localStore, organizationId, (releases) =>
      releases.map((r) =>
        r._id === args.id ? { ...r, publishedAt: Date.now() } : r
      )
    )
  );

  const unpublishRelease = useMutation(
    api.changelog.actions.unpublish
  ).withOptimisticUpdate((localStore, args) =>
    updateReleaseList(localStore, organizationId, (releases) =>
      releases.map((r) =>
        r._id === args.id ? { ...r, publishedAt: undefined } : r
      )
    )
  );

  return { deleteRelease, publishRelease, unpublishRelease };
}
