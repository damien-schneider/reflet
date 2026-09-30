"use client";

import { Extension } from "@tiptap/core";
import { ReactRenderer } from "@tiptap/react";
import Suggestion, {
  type SuggestionOptions,
  type SuggestionProps,
} from "@tiptap/suggestion";
import tippy, { type Instance as TippyInstance } from "tippy.js";
import {
  type CommandItem,
  type CommandListHandle,
  type CommandListProps,
  createSlashCommands,
} from "./command-items";
import { CommandList } from "./command-list";

// Z-index for slash menu popup - must be higher than dialogs (z-50 = 50) to work inside them
export const SLASH_MENU_Z_INDEX = 100;

// Data attribute used by base-ui dialog to identify dialog content
const DIALOG_CONTENT_SELECTOR = '[data-slot="dialog-content"]';

/**
 * Find the appropriate element to append the tippy popup to.
 * If the editor is inside a dialog, returns the dialog content element.
 * Otherwise returns document.body.
 *
 * This is critical for modal dialogs which block pointer events on elements
 * outside the dialog. By appending inside the dialog, clicks work properly.
 */
export function findAppendTarget(editorElement: Element | null): Element {
  if (!editorElement) {
    return document.body;
  }

  // Check if we're inside a dialog by looking for the dialog content element
  const dialogContent = editorElement.closest(DIALOG_CONTENT_SELECTOR);

  if (dialogContent) {
    return dialogContent;
  }

  return document.body;
}

export interface SuggestionConfig {
  onImageUpload?: () => void;
  onVideoUpload?: () => void;
}

const createSuggestion = ({
  onImageUpload,
  onVideoUpload,
}: SuggestionConfig): Omit<SuggestionOptions<CommandItem>, "editor"> => ({
  command: ({ editor, range, props: item }) => {
    item.command({ editor, range });
  },
  items: ({ query }) => {
    const commands = createSlashCommands(onImageUpload, onVideoUpload);
    return commands.filter((item) =>
      item.title.toLowerCase().includes(query.toLowerCase())
    );
  },

  render: () => {
    let component: ReactRenderer<CommandListHandle, CommandListProps> | null =
      null;
    let popup: TippyInstance[] | null = null;

    return {
      onExit: () => {
        popup?.[0]?.destroy();
        component?.destroy();
      },

      onKeyDown: (props: { event: KeyboardEvent }) => {
        if (props.event.key === "Escape") {
          popup?.[0]?.hide();
          return true;
        }

        return component?.ref?.onKeyDown(props) ?? false;
      },
      onStart: (props: SuggestionProps<CommandItem>) => {
        component = new ReactRenderer(CommandList, {
          editor: props.editor,
          props: {
            command: props.command,
            items: props.items,
          },
        });

        const { clientRect } = props;
        if (!clientRect) {
          return;
        }

        const appendTarget = findAppendTarget(props.editor.view.dom);
        popup = tippy("body", {
          animation: false,
          appendTo: () => appendTarget,
          content: component.element,
          duration: 0,
          getReferenceClientRect: () => clientRect() ?? new DOMRect(),
          interactive: true,
          placement: "bottom-start",
          showOnCreate: true,
          trigger: "manual",
          zIndex: SLASH_MENU_Z_INDEX,
        });
      },

      onUpdate: (props: SuggestionProps<CommandItem>) => {
        component?.updateProps({
          command: props.command,
          items: props.items,
        });

        const { clientRect } = props;
        if (!clientRect) {
          return;
        }

        popup?.[0]?.setProps({
          getReferenceClientRect: () => clientRect() ?? new DOMRect(),
        });
      },
    };
  },
});

interface SlashCommandOptions {
  suggestion: Omit<SuggestionOptions<CommandItem>, "editor">;
}

export const SlashCommand = Extension.create<SlashCommandOptions>({
  addOptions() {
    return {
      suggestion: createSuggestion({}),
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
  name: "slashCommand",
});

export const createSlashCommandExtension = (config: SuggestionConfig) =>
  SlashCommand.configure({
    suggestion: {
      ...createSuggestion(config),
      char: "/",
    },
  });
