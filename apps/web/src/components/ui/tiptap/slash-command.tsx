"use client";

import {
  Code,
  Image,
  ListBullets,
  ListNumbers,
  Minus,
  Quotes,
  TextHOne,
  TextHThree,
  TextHTwo,
  VideoCamera,
} from "@phosphor-icons/react";
import { type Editor, Extension } from "@tiptap/core";
import { ReactRenderer } from "@tiptap/react";
import Suggestion, {
  type SuggestionOptions,
  type SuggestionProps,
} from "@tiptap/suggestion";
import { useCallback, useEffect, useState } from "react";
import tippy, { type Instance as TippyInstance } from "tippy.js";
import { cn } from "@/lib/utils";

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

interface CommandItem {
  title: string;
  description: string;
  icon: React.ElementType;
  command: (props: {
    editor: Editor;
    range: { from: number; to: number };
  }) => void;
}

interface CommandListProps {
  items: CommandItem[];
  command: (item: CommandItem) => void;
  /**
   * Callback to register the keyboard handler.
   * This is called on mount with the handler function, allowing the parent
   * to invoke keyboard handling without relying on React refs.
   */
  onRegisterKeyHandler: (handler: (event: KeyboardEvent) => boolean) => void;
}

/**
 * CommandList component renders the slash command menu.
 * Uses callback-based keyboard handling instead of imperative refs
 * for better compatibility with ReactRenderer.
 */
function CommandList({
  items,
  command,
  onRegisterKeyHandler,
}: CommandListProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = useCallback(
    (index: number) => {
      const item = items[index];
      if (item) {
        command(item);
      }
    },
    [items, command]
  );

  // Reset selection when items change
  useEffect(() => {
    setSelectedIndex(0);
  }, [items]);

  // Register keyboard handler on mount and when dependencies change
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): boolean => {
      if (event.key === "ArrowUp") {
        setSelectedIndex((prev) => (prev + items.length - 1) % items.length);
        return true;
      }

      if (event.key === "ArrowDown") {
        setSelectedIndex((prev) => (prev + 1) % items.length);
        return true;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        event.stopPropagation();
        selectItem(selectedIndex);
        return true;
      }

      return false;
    };

    onRegisterKeyHandler(handleKeyDown);
  }, [items.length, selectedIndex, selectItem, onRegisterKeyHandler]);

  if (items.length === 0) {
    return null;
  }

  return (
    <div
      className="bg-popover text-popover-foreground max-h-72 overflow-y-auto rounded-xl border p-1 shadow-lg"
      data-slot="slash-command-menu"
    >
      {items.map((item, index) => {
        const Icon = item.icon;
        return (
          <button
            className={cn(
              "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm outline-none",
              "hover:bg-muted",
              selectedIndex === index && "bg-muted"
            )}
            key={item.title}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              selectItem(index);
            }}
            onMouseDown={(e) => {
              // Prevent focus loss which would close the menu
              e.preventDefault();
            }}
            type="button"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-md border bg-background">
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <p className="font-medium">{item.title}</p>
              <p className="text-muted-foreground text-xs">
                {item.description}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export const createSlashCommands = (
  onImageUpload?: () => void,
  onVideoUpload?: () => void
): CommandItem[] => {
  const commands: CommandItem[] = [
    {
      title: "Heading 1",
      description: "Large section heading",
      icon: TextHOne,
      command: ({ editor, range }) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .toggleHeading({ level: 1 })
          .run();
      },
    },
    {
      title: "Heading 2",
      description: "Medium section heading",
      icon: TextHTwo,
      command: ({ editor, range }) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .toggleHeading({ level: 2 })
          .run();
      },
    },
    {
      title: "Heading 3",
      description: "Small section heading",
      icon: TextHThree,
      command: ({ editor, range }) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .toggleHeading({ level: 3 })
          .run();
      },
    },
    {
      title: "Bullet List",
      description: "Create a bullet list",
      icon: ListBullets,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleBulletList().run();
      },
    },
    {
      title: "Numbered List",
      description: "Create a numbered list",
      icon: ListNumbers,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleOrderedList().run();
      },
    },
    {
      title: "Quote",
      description: "Capture a quote",
      icon: Quotes,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleBlockquote().run();
      },
    },
    {
      title: "Code Block",
      description: "Display code with syntax highlighting",
      icon: Code,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
      },
    },
    {
      title: "Divider",
      description: "Insert a horizontal divider",
      icon: Minus,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setHorizontalRule().run();
      },
    },
  ];

  if (onImageUpload) {
    commands.push({
      title: "Image",
      description: "Upload an image",
      icon: Image,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run();
        onImageUpload();
      },
    });
  }

  if (onVideoUpload) {
    commands.push({
      title: "Video",
      description: "Upload a video",
      icon: VideoCamera,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run();
        onVideoUpload();
      },
    });
  }

  return commands;
};

interface SuggestionConfig {
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

  // This is the critical function that executes when a user selects an item
  // The suggestion plugin calls this with { editor, range, props: selectedItem }
  command: ({ editor, range, props: item }) => {
    item.command({ editor, range });
  },

  render: () => {
    let component: ReactRenderer | null = null;
    let popup: TippyInstance[] | null = null;
    // Store the keyboard handler function externally for reliable access
    // This avoids issues with ReactRenderer refs not properly capturing useImperativeHandle
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

        // Find the appropriate append target - dialog content if inside a dialog,
        // otherwise document.body. This is critical for modal dialogs which
        // block pointer events on elements outside the dialog.
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

        // Use the registered keyboard handler instead of refs
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
