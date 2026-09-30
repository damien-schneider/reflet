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
import type * as React from "react";
import { useEffect, useState } from "react";
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

const TOOLBAR_KEY_STEPS: Readonly<Record<string, number>> = {
  ArrowLeft: -1,
  ArrowRight: 1,
};

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

  const handleToolbarKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step = TOOLBAR_KEY_STEPS[event.key];
    if (step === undefined) {
      return;
    }
    const buttons = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>("button")
    );
    const currentIndex = buttons.findIndex(
      (button) => button === document.activeElement
    );
    const nextIndex = (currentIndex + step + buttons.length) % buttons.length;
    event.preventDefault();
    buttons[nextIndex]?.focus();
  };

  return (
    <div
      className="tiptap-image-bubble-menu pointer-events-auto absolute z-50 -translate-x-1/2"
      style={{ left: position.left, top: position.top }}
    >
      <div
        aria-label="Image alignment"
        className="flex items-center gap-0.5 p-1"
        data-control-family="popup"
        data-popup-part="surface"
        data-popup-static=""
        onKeyDown={handleToolbarKeyDown}
        role="toolbar"
      >
        {ALIGNMENTS.map(({ icon: Icon, label, value }) => (
          <Tooltip key={value}>
            <TooltipTrigger
              aria-label={label}
              aria-pressed={currentAlign === value}
              render={
                <Button
                  active={currentAlign === value}
                  iconOnly
                  onClick={() => {
                    editor
                      .chain()
                      .focus()
                      .updateAttributes("image", { align: value })
                      .run();
                  }}
                  size="sm"
                  tabIndex={currentAlign === value ? 0 : -1}
                  variant="ghost"
                />
              }
            >
              <Icon aria-hidden="true" className="size-4" />
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
          </Tooltip>
        ))}
      </div>
    </div>
  );
}
