"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ctrl-ui/react/ui/tooltip";
import {
  type Icon,
  TextAlignCenter,
  TextAlignLeft,
  TextAlignRight,
} from "@phosphor-icons/react";
import type { Editor } from "@tiptap/core";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { ImageAlignment } from "./image-extension";

const ALIGNMENTS: readonly {
  icon: Icon;
  label: string;
  value: ImageAlignment;
}[] = [
  { icon: TextAlignLeft, label: "Align left", value: "left" },
  { icon: TextAlignCenter, label: "Align center", value: "center" },
  { icon: TextAlignRight, label: "Align right", value: "right" },
];

const BUBBLE_OFFSET_Y = 40;

interface ImageBubbleMenuProps {
  editor: Editor;
}

export function ImageBubbleMenu({ editor }: ImageBubbleMenuProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const [currentAlign, setCurrentAlign] = useState<ImageAlignment>("center");

  useEffect(() => {
    const updateMenu = () => {
      const isImageActive = editor.isActive("image");
      setIsVisible(isImageActive);

      if (!isImageActive) {
        return;
      }

      const { align } = editor.getAttributes("image");
      const isValidAlignment =
        align === "left" || align === "center" || align === "right";
      setCurrentAlign(isValidAlignment ? align : "center");

      const { view } = editor;
      const { from } = view.state.selection;
      const domPos = view.domAtPos(from);
      const element: Element | null =
        domPos.node instanceof Element
          ? domPos.node
          : domPos.node.parentElement;

      const img =
        element?.tagName === "IMG"
          ? element
          : element?.querySelector?.("img") ||
            element?.parentElement?.querySelector?.("img");

      if (!img) {
        return;
      }

      const rect = img.getBoundingClientRect();
      const editorRect = view.dom.getBoundingClientRect();

      setPosition({
        left: rect.left - editorRect.left + rect.width / 2,
        top: rect.top - editorRect.top - BUBBLE_OFFSET_Y,
      });
    };

    editor.on("selectionUpdate", updateMenu);
    editor.on("transaction", updateMenu);

    updateMenu();

    return () => {
      editor.off("selectionUpdate", updateMenu);
      editor.off("transaction", updateMenu);
    };
  }, [editor]);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className="tiptap-image-bubble-menu pointer-events-auto absolute z-50 -translate-x-1/2"
      style={{ left: position.left, top: position.top }}
    >
      <div className="flex items-center gap-1 rounded-lg border bg-background p-1 shadow-lg">
        {ALIGNMENTS.map(({ icon: Icon, label, value }) => (
          <Tooltip key={value}>
            <TooltipTrigger
              aria-label={label}
              aria-pressed={currentAlign === value}
              render={
                <Button
                  active={currentAlign === value}
                  className={cn(
                    "rounded",
                    currentAlign === value && "bg-muted text-primary"
                  )}
                  iconOnly
                  onClick={() => {
                    editor
                      .chain()
                      .focus()
                      .updateAttributes("image", { align: value })
                      .run();
                  }}
                  variant="ghost"
                />
              }
            >
              <Icon className="h-4 w-4" />
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
          </Tooltip>
        ))}
      </div>
    </div>
  );
}
