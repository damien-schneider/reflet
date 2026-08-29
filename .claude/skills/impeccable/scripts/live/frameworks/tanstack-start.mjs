/**
 * TanStack Start registry entry.
 *
 * Detection and the apply/remove pair are the existing adapter's
 * (`../tanstack-adapter.mjs`); this file only declares them to the registry
 * and names the artifacts the journal has to be able to heal.
 */

import {
  applyTanStackLiveAdapter,
  detectTanStackStartProject,
  removeTanStackLiveAdapter,
  TANSTACK_MARKER_OPEN,
  unpatchTanStackRoot,
} from "../tanstack-adapter.mjs";

export const tanstackStart = {
  detect(cwd) {
    return detectTanStackStartProject(cwd);
  },

  inject: {
    apply({ cwd, port, token, project }) {
      return applyTanStackLiveAdapter({ cwd, port, project, token });
    },

    artifacts({ project }) {
      if (!project) {
        return [];
      }
      return [
        {
          kind: "created",
          marker: "impeccable-live-tanstack",
          path: project.componentFile,
          pruneTo: "src",
        },
        {
          kind: "patched",
          markers: [TANSTACK_MARKER_OPEN],
          patch: "tanstack-root",
          path: project.rootRoute,
        },
      ];
    },

    // The mount component's extension follows the root route's, so the path
    // cannot live in the static ignore list.
    ignorePatterns(project) {
      return project?.componentFile ? [project.componentFile] : [];
    },
    kind: "adapter",

    remove({ cwd, project }) {
      return removeTanStackLiveAdapter({ cwd, project });
    },

    unpatch: {
      "tanstack-root": unpatchTanStackRoot,
    },
  },
  name: "tanstack-start",

  source: {
    commentSyntax: "jsx",
    extensions: [".tsx", ".jsx"],
    preview: "source",
    styleMode: "scoped",
  },
};
