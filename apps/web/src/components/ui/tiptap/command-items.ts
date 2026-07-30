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
  command: (props: {
    editor: Editor;
    range: { from: number; to: number };
  }) => void;
  description: string;
  icon: React.ElementType;
  title: string;
}

export interface CommandListProps {
  command: (item: CommandItem) => void;
  items: CommandItem[];
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
      command: ({ editor, range }) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .toggleHeading({ level: 1 })
          .run();
      },
      description: "Large section heading",
      icon: TextHOne,
      title: "Heading 1",
    },
    {
      command: ({ editor, range }) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .toggleHeading({ level: 2 })
          .run();
      },
      description: "Medium section heading",
      icon: TextHTwo,
      title: "Heading 2",
    },
    {
      command: ({ editor, range }) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .toggleHeading({ level: 3 })
          .run();
      },
      description: "Small section heading",
      icon: TextHThree,
      title: "Heading 3",
    },
    {
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleBulletList().run();
      },
      description: "Create a bullet list",
      icon: ListBullets,
      title: "Bullet List",
    },
    {
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleOrderedList().run();
      },
      description: "Create a numbered list",
      icon: ListNumbers,
      title: "Numbered List",
    },
    {
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleBlockquote().run();
      },
      description: "Capture a quote",
      icon: Quotes,
      title: "Quote",
    },
    {
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
      },
      description: "Display code with syntax highlighting",
      icon: Code,
      title: "Code Block",
    },
    {
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setHorizontalRule().run();
      },
      description: "Insert a horizontal divider",
      icon: Minus,
      title: "Divider",
    },
  ];

  if (onImageUpload) {
    commands.push({
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run();
        onImageUpload();
      },
      description: "Upload an image",
      icon: Image,
      title: "Image",
    });
  }

  if (onVideoUpload) {
    commands.push({
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run();
        onVideoUpload();
      },
      description: "Upload a video",
      icon: VideoCamera,
      title: "Video",
    });
  }

  return commands;
};
