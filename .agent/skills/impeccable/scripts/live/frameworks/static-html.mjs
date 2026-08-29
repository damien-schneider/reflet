/**
 * Static HTML registry entry: the terminal fallback.
 *
 * Hand-written pages, a multi-page site emitted by a generator, anything with
 * no bundler config at the app root. `detect` always matches, so this entry
 * must stay last in FRAMEWORKS. Its behavior is the plain tag strategy, which
 * is what live-inject.mjs did for every unrecognized project before the
 * registry existed.
 */

export const staticHtml = {
  detect() {
    return { via: "fallback" };
  },

  inject: { kind: "tag" },
  name: "static-html",

  source: {
    commentSyntax: "html",
    extensions: [".html", ".htm"],
    preview: "source",
    styleMode: "scoped",
  },
};
