"use client";

import { Extension } from "@tiptap/core";
import { ReactRenderer } from "@tiptap/react";
import Suggestion, {
  type SuggestionOptions,
  type SuggestionProps,
} from "@tiptap/suggestion";
import tippy, { type Instance as TippyInstance } from "tippy.js";
import { type CommandItem, createSlashCommands } from "./command-items";
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
  items: ({ query }) => {
    const commands = createSlashCommands(onImageUpload, onVideoUpload);
    return commands.filter((item) =>
      item.title.toLowerCase().includes(query.toLowerCase())
    );
  },

  command: ({ editor, range, props: item }) => {
    item.command({ editor, range });
  },

  render: () => {
    let component: ReactRenderer | null = null;
    let popup: TippyInstance[] | null = null;
    let keyboardHandler: ((event: KeyboardEvent) => boolean) | null = null;

    return {
      onStart: (props: SuggestionProps<CommandItem>) => {
        component = new ReactRenderer(CommandList, {
          props: {
            items: props.items,
            command: props.command,
            onRegisterKeyHandler: (
              handler: (event: KeyboardEvent) => boolean
            ) => {
              keyboardHandler = handler;
            },
          },
          editor: props.editor,
        });

        if (!props.clientRect) {
          return;
        }

        const appendTarget = findAppendTarget(props.editor.view.dom);

        popup = tippy("body", {
          getReferenceClientRect: props.clientRect as () => DOMRect,
          appendTo: () => appendTarget,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: "manual",
          placement: "bottom-start",
          zIndex: SLASH_MENU_Z_INDEX,
        });
      },

      onUpdate: (props: SuggestionProps<CommandItem>) => {
        component?.updateProps({
          items: props.items,
          command: props.command,
          onRegisterKeyHandler: (
            handler: (event: KeyboardEvent) => boolean
          ) => {
            keyboardHandler = handler;
          },
        });

        if (!props.clientRect) {
          return;
        }

        popup?.[0]?.setProps({
          getReferenceClientRect: props.clientRect as () => DOMRect,
        });
      },

      onKeyDown: (props: { event: KeyboardEvent }) => {
        if (props.event.key === "Escape") {
          popup?.[0]?.hide();
          return true;
        }

        if (keyboardHandler) {
          return keyboardHandler(props.event);
        }

        return false;
      },

      onExit: () => {
        popup?.[0]?.destroy();
        component?.destroy();
        keyboardHandler = null;
      },
    };
  },
});

interface SlashCommandOptions {
  suggestion: Omit<SuggestionOptions<CommandItem>, "editor">;
}

export const SlashCommand = Extension.create<SlashCommandOptions>({
  name: "slashCommand",

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
});

export const createSlashCommandExtension = (config: SuggestionConfig) =>
  SlashCommand.configure({
    suggestion: {
      ...createSuggestion(config),
      char: "/",
    },
  });
