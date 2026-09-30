import { mergeAttributes, Node } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";

interface MarkdownSerializerState {
  closeBlock: (node: ProseMirrorNode) => void;
  write: (content: string) => void;
}

const ESCAPED_VIDEO_PATTERN = /^<video\s+src="([^"]+)"[^<>]*><\/video>$/;

const isAllowedVideoSrc = (src: unknown): src is string =>
  typeof src === "string" &&
  URL.canParse(src) &&
  new URL(src).protocol === "https:";

const serializeVideo = (
  state: MarkdownSerializerState,
  node: ProseMirrorNode
): void => {
  const { src } = node.attrs;
  if (!isAllowedVideoSrc(src)) {
    return;
  }
  const escapedSrc = src
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
  state.write(
    `<video src="${escapedSrc}" controls class="tiptap-video" preload="metadata"></video>`
  );
  state.closeBlock(node);
};

const restoreEscapedVideos = (element: HTMLElement): void => {
  for (const paragraph of element.querySelectorAll("p")) {
    if (paragraph.childElementCount > 0) {
      continue;
    }
    const src = paragraph.textContent?.trim().match(ESCAPED_VIDEO_PATTERN)?.[1];
    if (!isAllowedVideoSrc(src)) {
      continue;
    }
    const video = paragraph.ownerDocument.createElement("video");
    video.setAttribute("src", src);
    paragraph.replaceWith(video);
  }
};

export const VideoExtension = Node.create({
  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (element) => element.getAttribute("src"),
      },
    };
  },

  addStorage() {
    return {
      markdown: {
        parse: {},
        serialize: serializeVideo,
      },
    };
  },

  atom: true,
  draggable: true,
  group: "block",
  name: "video",

  parseHTML() {
    return [
      {
        getAttrs: (element) =>
          isAllowedVideoSrc(element.getAttribute("src")) ? null : false,
        tag: "video[src]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "video",
      mergeAttributes(
        { class: "tiptap-video", controls: "", preload: "metadata" },
        HTMLAttributes
      ),
    ];
  },
});

export const ReadOnlyVideoExtension = VideoExtension.extend({
  addStorage() {
    return {
      markdown: {
        parse: { updateDOM: restoreEscapedVideos },
        serialize: serializeVideo,
      },
    };
  },
});
