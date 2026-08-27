"use client";

import type { DOMOutputSpec, NodeSpec, Node as ProseMirrorNode } from "prosemirror-model";
import type { Command } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import { useEffect } from "react";
import type { MentionItem, TriggerConfig, TriggerMenuItemData } from "@/components/control-ui/contracts";
import { useTriggerMenu } from "@/components/control-ui/hooks/use-trigger-menu";
import { detectTrigger } from "@/components/control-ui/lib/trigger-detect";
import { TriggerMenu, TriggerMenuEmpty, TriggerMenuIcon, TriggerMenuItem, TriggerMenuList } from "@/components/control-ui/ui/trigger-menu";
import { spawnExitGhost } from "../ghost";
import type { ChatComposerEditorApi, ChatComposerEditorExtension } from "../types";

// Ships the "@" pill as one composable unit, so base editor stays mention-free.

// ProseMirror types attrs as `any`, so each is read through typeof guard rather than asserted
function attrString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

// atom + contenteditable=false makes it one non-editable unit arrows skip over; leafText serializes it back to "@label"
const mentionNode: NodeSpec = {
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  draggable: false,
  attrs: {
    id: { default: "" },
    label: { default: "" },
    kind: { default: "mention" },
    icon: { default: null },
  },
  parseDOM: [
    {
      tag: "span[data-mention]",
      getAttrs: (dom) => {
        if (typeof dom === "string") return false;
        return {
          id: dom.getAttribute("data-id") ?? "",
          label: dom.textContent ?? "",
          kind: dom.getAttribute("data-mention") ?? "mention",
          icon: dom.getAttribute("data-icon"),
        };
      },
    },
  ],
  toDOM: (node): DOMOutputSpec => {
    const label = attrString(node.attrs.label, "");
    const id = attrString(node.attrs.id, "");
    const kind = attrString(node.attrs.kind, "mention");
    const icon = typeof node.attrs.icon === "string" ? node.attrs.icon : null;
    const attrs = {
      class: "inline-flex items-center gap-1 px-1 align-baseline",
      "data-control-ui": "chat-composer",
      "data-control-family": "chat-composer",
      "data-slot": "mention",
      "data-mention": kind,
      "data-id": id,
      "data-icon": icon ?? "",
      contenteditable: "false",
    };
    const labelSpan: DOMOutputSpec = [
      "span",
      {
        class: "truncate",
        "data-control-ui": "chat-composer",
        "data-control-family": "chat-composer",
        "data-slot": "mention-label",
      },
      label,
    ];
    return icon === null
      ? ["span", attrs, labelSpan]
      : [
          "span",
          attrs,
          [
            "img",
            {
              src: icon,
              alt: "",
              class: "size-4 shrink-0",
              "data-control-ui": "chat-composer",
              "data-control-family": "chat-composer",
              "data-slot": "mention-icon",
            },
          ],
          labelSpan,
        ];
  },
  leafText: (node) => `@${attrString(node.attrs.label, "")}`,
};

type EditorTriggerState = {
  active: boolean;
  from: number;
  to: number;
  char: string;
  query: string;
  rect: DOMRect | null;
};

const INACTIVE: EditorTriggerState = { active: false, from: 0, to: 0, char: "", query: "", rect: null };

// reads off live view so positions are never stale
function readEditorTrigger(view: EditorView, triggerChars: readonly string[]): EditorTriggerState {
  const { selection } = view.state;
  if (!selection.empty) return INACTIVE;
  const { $from } = selection;
  if (!$from.parent.isTextblock) return INACTIVE;
  const start = $from.start();
  // atoms collapse to one sentinel char so string offsets map 1:1 onto doc positions
  const textBefore = view.state.doc.textBetween(start, $from.pos, undefined, () => "￼");
  const match = detectTrigger(textBefore, triggerChars);
  if (match === null) return INACTIVE;
  const coords = view.coordsAtPos($from.pos);
  return {
    active: true,
    from: start + match.start,
    to: $from.pos,
    char: match.char,
    query: match.query,
    rect: new DOMRect(coords.left, coords.top, 1, coords.bottom - coords.top),
  };
}

type MentionNodeAttrs = { id: string; label: string; kind?: string; icon?: string | null };

function insertMention(view: EditorView, from: number, to: number, attrs: MentionNodeAttrs) {
  const node = view.state.schema.nodes.mention.create({
    id: attrs.id,
    label: attrs.label,
    kind: attrs.kind ?? "mention",
    icon: attrs.icon ?? null,
  });
  const transaction = view.state.tr.replaceWith(from, to, node);
  transaction.insertText(" ");
  view.dispatch(transaction);
  view.focus();
}

// for slash-commands that run action instead of inserting
function deleteTriggerToken(view: EditorView, from: number, to: number) {
  view.dispatch(view.state.tr.delete(from, to));
  view.focus();
}

// must run before transaction lands, while nodeDOM can still return pill to clone
function ghostPill(view: EditorView | undefined, pillPos: number): void {
  const dom = view?.nodeDOM(pillPos);
  if (dom instanceof HTMLElement) spawnExitGhost(dom);
}

// lone atom at block end gets trailing <br>, so plain Backspace reads as adding newline rather than removing pill.
// Deleting pill and its auto-inserted space in one keystroke avoids ever leaving that lone trailing atom.
export const deleteMentionBackward: Command = (state, dispatch, view) => {
  const { selection } = state;
  if (!selection.empty) return false;
  const { $from } = selection;
  const before = $from.nodeBefore;
  if (!before) return false;
  if (before.type.name === "mention") {
    const pillPos = $from.pos - before.nodeSize;
    if (dispatch) {
      ghostPill(view, pillPos);
      dispatch(state.tr.delete(pillPos, $from.pos).scrollIntoView());
    }
    return true;
  }
  // at block end space and pill go together, or pill becomes last node and draws phantom line
  if (before.isText && before.text === " " && $from.pos === $from.end()) {
    const beforeSpace = state.doc.resolve($from.pos - before.nodeSize).nodeBefore;
    if (beforeSpace && beforeSpace.type.name === "mention") {
      const pillPos = $from.pos - before.nodeSize - beforeSpace.nodeSize;
      if (dispatch) {
        ghostPill(view, pillPos);
        dispatch(state.tr.delete(pillPos, $from.pos).scrollIntoView());
      }
      return true;
    }
  }
  return false;
};

// forward-delete symmetry with Backspace commands above
export const deleteMentionForward: Command = (state, dispatch, view) => {
  const { selection } = state;
  if (!selection.empty) return false;
  const { $from } = selection;
  const after = $from.nodeAfter;
  if (after?.type.name !== "mention") return false;
  if (dispatch) {
    ghostPill(view, $from.pos);
    dispatch(state.tr.delete($from.pos, $from.pos + after.nodeSize).scrollIntoView());
  }
  return true;
};

// ids agent consumes, ridden along on submit payload beside plain text
function collectMentions(doc: ProseMirrorNode): MentionItem[] {
  const mentions: MentionItem[] = [];
  doc.descendants((node) => {
    if (node.type.name === "mention") {
      mentions.push({
        id: attrString(node.attrs.id, ""),
        label: attrString(node.attrs.label, ""),
        kind: attrString(node.attrs.kind, "mention"),
      });
    }
  });
  return mentions;
}

type MentionOverlayProps<Item extends TriggerMenuItemData> = {
  editor: ChatComposerEditorApi;
  triggers: readonly TriggerConfig<Item>[];
  side: "top" | "bottom";
  align: "start" | "center" | "end";
};

// talks to doc only through editor api, so no ProseMirror plugin is needed and base editor stays mention-unaware
function MentionOverlay<Item extends TriggerMenuItemData>({ editor, triggers, side, align }: MentionOverlayProps<Item>) {
  const chars = triggers.map((trigger) => trigger.char);

  const controller = useTriggerMenu<Item>({
    triggers,
    onCommit: (item, trigger) => {
      const view = editor.getView();
      if (!view) return;
      const state = readEditorTrigger(view, chars);
      if (!state.active) return;
      if ((trigger.insert ?? "replace") === "none") {
        deleteTriggerToken(view, state.from, state.to);
      } else {
        insertMention(view, state.from, state.to, { id: item.id, label: item.label, kind: item.kind, icon: item.image ?? null });
      }
      trigger.onSelect?.(item, { char: state.char, query: state.query });
    },
  });

  useEffect(() => {
    return editor.subscribe(() => {
      const view = editor.getView();
      if (!view) return;
      const state = readEditorTrigger(view, chars);
      controller.report(state.active ? { char: state.char, query: state.query, start: state.from, end: state.to } : null, state.rect);
    });
  }, [editor, controller, chars]);

  // open menu eats arrows, Enter, and Esc before editor's keymaps see them
  useEffect(() => {
    return editor.registerKeyHandler((event) => {
      const view = editor.getView();
      if (!view) return false;
      if (!readEditorTrigger(view, chars).active) return false;
      return controller.handleKeyDown(event.key);
    });
  }, [editor, controller, chars]);

  if (triggers.length === 0) return null;
  return (
    <TriggerMenu open={controller.open} onOpenChange={controller.setOpen} anchorRect={controller.anchorRect} side={side} align={align}>
      <TriggerMenuList>
        {controller.items.length === 0 ? (
          <TriggerMenuEmpty>No results</TriggerMenuEmpty>
        ) : (
          controller.items.map((item, index) => (
            <TriggerMenuItem
              key={item.id}
              active={index === controller.activeIndex}
              disabled={item.disabled}
              onPointerMove={() => controller.setActiveIndex(index)}
              onClick={() => controller.select(item)}
            >
              {item.icon ? <TriggerMenuIcon>{item.icon}</TriggerMenuIcon> : null}
              <span className="flex-1 truncate">{item.label}</span>
              {item.description ? (
                <span
                  data-control-ui="chat-composer"
                  data-control-family="chat-composer"
                  data-slot="mention-description"
                  className="truncate"
                >
                  {item.description}
                </span>
              ) : null}
            </TriggerMenuItem>
          ))
        )}
      </TriggerMenuList>
    </TriggerMenu>
  );
}

export type MentionExtensionConfig<Item extends TriggerMenuItemData = TriggerMenuItemData> = {
  triggers: readonly TriggerConfig<Item>[];
  side?: "top" | "bottom";
  align?: "start" | "center" | "end";
};

export function mentionExtension<Item extends TriggerMenuItemData = TriggerMenuItemData>({
  triggers,
  side = "top",
  align = "start",
}: MentionExtensionConfig<Item>): ChatComposerEditorExtension {
  return {
    name: "mention",
    nodes: { mention: mentionNode },
    keymap: () => ({ Backspace: deleteMentionBackward, Delete: deleteMentionForward }),
    submitPayload: (doc) => ({ mentions: collectMentions(doc) }),
    Overlay: ({ editor }) => <MentionOverlay editor={editor} triggers={triggers} side={side} align={align} />,
  };
}
