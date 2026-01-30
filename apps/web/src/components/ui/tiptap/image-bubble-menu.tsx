"use client";

import {
  TextAlignCenter,
  TextAlignLeft,
  TextAlignRight,
} from "@phosphor-icons/react";
import type { Editor } from "@tiptap/core";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { ImageAlignment } from "./image-extension";

interface ImageBubbleMenuProps {
  editor: Editor;
}

export function ImageBubbleMenu({ editor }: ImageBubbleMenuProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const setAlignment = (align: ImageAlignment) => {
    editor.chain().focus().updateAttributes("image", { align }).run();
  };

  const currentAlign =
    (editor.getAttributes("image").align as ImageAlignment) || "center";

  useEffect(() => {
    const updateMenu = () => {
      const isImageActive = editor.isActive("image");
      setIsVisible(isImageActive);

      if (isImageActive) {
        const { view } = editor;
        const { from } = view.state.selection;
        const node = view.domAtPos(from);
        const element = node.node as HTMLElement;

        // Find the image element
        const img =
          element.tagName === "IMG"
            ? element
            : element.querySelector?.("img") ||
              element.parentElement?.querySelector?.("img");

        if (img) {
          const rect = img.getBoundingClientRect();
          const editorRect = view.dom.getBoundingClientRect();

          setPosition({
            top: rect.top - editorRect.top - 40,
            left: rect.left - editorRect.left + rect.width / 2,
          });
        }
      }
    };

    editor.on("selectionUpdate", updateMenu);
    editor.on("transaction", updateMenu);

    return () => {
      editor.off("selectionUpdate", updateMenu);
      editor.off("transaction", updateMenu);
    };
  }, [editor]);

  if (!isVisible) return null;

  return (
    <div
      className="tiptap-image-bubble-menu pointer-events-auto absolute z-50 -translate-x-1/2"
      style={{ top: position.top, left: position.left }}
    >
      <div className="flex items-center gap-1 rounded-lg border bg-background p-1 shadow-lg">
        <button
          className={cn(
            "rounded p-1.5 transition-colors hover:bg-muted",
            currentAlign === "left" && "bg-muted text-primary"
          )}
          onClick={() => setAlignment("left")}
          title="Align left"
          type="button"
        >
          <TextAlignLeft className="h-4 w-4" />
        </button>
        <button
          className={cn(
            "rounded p-1.5 transition-colors hover:bg-muted",
            currentAlign === "center" && "bg-muted text-primary"
          )}
          onClick={() => setAlignment("center")}
          title="Align center"
          type="button"
        >
          <TextAlignCenter className="h-4 w-4" />
        </button>
        <button
          className={cn(
            "rounded p-1.5 transition-colors hover:bg-muted",
            currentAlign === "right" && "bg-muted text-primary"
          )}
          onClick={() => setAlignment("right")}
          title="Align right"
          type="button"
        >
          <TextAlignRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
