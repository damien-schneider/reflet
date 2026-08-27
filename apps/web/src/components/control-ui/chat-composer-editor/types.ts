import type { NodeSpec, Node as ProseMirrorNode, Schema } from "prosemirror-model";
import type { Command, Plugin } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import type { ReactNode } from "react";

import type { ChatComposerSubmitPayload } from "@/components/control-ui/contracts";

// stable for editor's lifetime, so extension never closes over stale view
export type ChatComposerEditorApi = {
  getView: () => EditorView | null;
  subscribe: (listener: () => void) => () => void;
  registerKeyHandler: (handler: (event: KeyboardEvent) => boolean) => () => void;
};

export type ChatComposerEditorOverlayProps = { editor: ChatComposerEditorApi };

// every field optional — mentions are one extension among possible others
export type ChatComposerEditorExtension = {
  // doubles as overlay's React key, so it must be stable and unique
  name: string;
  nodes?: Record<string, NodeSpec>;
  plugins?: (schema: Schema, editor: ChatComposerEditorApi) => Plugin[];
  keymap?: (schema: Schema) => Record<string, Command>;
  submitPayload?: (doc: ProseMirrorNode) => Partial<ChatComposerSubmitPayload>;
  Overlay?: (props: ChatComposerEditorOverlayProps) => ReactNode;
};

export type ChatComposerEditorProps = {
  className?: string;
  placeholder?: string;
  extensions?: readonly ChatComposerEditorExtension[];
};
