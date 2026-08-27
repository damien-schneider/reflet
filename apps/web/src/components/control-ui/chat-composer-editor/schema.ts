import type { DOMOutputSpec, NodeSpec } from "prosemirror-model";
import { Schema } from "prosemirror-model";

import type { ChatComposerEditorExtension } from "./types";

// stays mention-free — rich nodes arrive through createEditorSchema
const baseNodes: Record<string, NodeSpec> = {
  doc: { content: "block+" },
  paragraph: {
    group: "block",
    content: "inline*",
    parseDOM: [{ tag: "p" }],
    toDOM: (): DOMOutputSpec => ["p", 0],
  },
  text: { group: "inline" },
};

// later extensions win node-name collision
export function createEditorSchema(extensions: readonly ChatComposerEditorExtension[]): Schema {
  let nodes: Record<string, NodeSpec> = { ...baseNodes };
  for (const extension of extensions) {
    if (extension.nodes) nodes = { ...nodes, ...extension.nodes };
  }
  return new Schema({ nodes, marks: {} });
}
