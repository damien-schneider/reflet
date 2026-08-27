import type { Node as ProseMirrorNode, Schema } from "prosemirror-model";

// Each leaf serializes through its own schema `leafText`, so extensions stay self-describing and this stays mention-unaware.
export function serializeDoc(doc: ProseMirrorNode): string {
  return doc.textBetween(0, doc.content.size, "\n", (leaf) => {
    const leafText = leaf.type.spec.leafText;
    return typeof leafText === "function" ? leafText(leaf) : "";
  });
}

// external resets only — rebuilding doc from its own output would fight caret
export function docFromText(schema: Schema, text: string): ProseMirrorNode {
  const paragraph = schema.nodes.paragraph;
  const blocks = text.split("\n").map((line) => paragraph.create(null, line === "" ? null : schema.text(line)));
  return schema.nodes.doc.create(null, blocks.length === 0 ? paragraph.create() : blocks);
}
