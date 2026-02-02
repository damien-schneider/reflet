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
import type { Editor } from "@tiptap/core";

export interface CommandItem {
  title: string;
  description: string;
  icon: React.ElementType;
  command: (props: {
    editor: Editor;
    range: { from: number; to: number };
  }) => void;
}

export interface CommandListProps {
  items: CommandItem[];
  command: (item: CommandItem) => void;
  /**
   * Callback to register the keyboard handler.
   * This is called on mount with the handler function, allowing the parent
   * to invoke keyboard handling without relying on React refs.
   */
  onRegisterKeyHandler: (handler: (event: KeyboardEvent) => boolean) => void;
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
