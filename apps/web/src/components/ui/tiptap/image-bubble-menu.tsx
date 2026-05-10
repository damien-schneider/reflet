"use client";

import {
  TextAlignCenter,
  TextAlignLeft,
  TextAlignRight,
} from "@phosphor-icons/react";
import { useEffect, useReducer } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ImageAlignment } from "./image-extension";

export interface ImageBubbleMenuEditor {
  chain: () => {
    focus: () => {
      updateAttributes: (
        name: "image",
        attributes: { align: ImageAlignment }
      ) => { run: () => boolean };
    };
  };
  getAttributes: (name: "image") => Record<string, unknown>;
  isActive: (name: "image") => boolean;
  off: (event: "selectionUpdate" | "transaction", callback: () => void) => void;
  on: (event: "selectionUpdate" | "transaction", callback: () => void) => void;
  view: {
    dom: HTMLElement;
    domAtPos: (position: number) => { node: Node };
    state: { selection: { from: number } };
  };
}

interface ImageBubbleMenuProps {
  editor: ImageBubbleMenuEditor;
}

interface ImageMenuPosition {
  left: number;
  top: number;
}

interface ImageMenuState {
  currentAlign: ImageAlignment;
  isVisible: boolean;
  position: ImageMenuPosition;
}

type ImageMenuAction =
  | { type: "hide" }
  | {
      currentAlign: ImageAlignment;
      position: ImageMenuPosition;
      type: "show";
    };

const initialImageMenuState: ImageMenuState = {
  currentAlign: "center",
  isVisible: false,
  position: { top: 0, left: 0 },
};

function imageMenuReducer(
  state: ImageMenuState,
  action: ImageMenuAction
): ImageMenuState {
  switch (action.type) {
    case "hide":
      return state.isVisible ? { ...state, isVisible: false } : state;
    case "show":
      return {
        currentAlign: action.currentAlign,
        isVisible: true,
        position: action.position,
      };
  }
}

function resolveImageAlignment(value: unknown): ImageAlignment {
  if (value === "left" || value === "center" || value === "right") {
    return value;
  }
  return "center";
}

function findSelectedImageElement(node: Node): Element | null {
  const element = node instanceof Element ? node : node.parentElement;
  if (!element) {
    return null;
  }
  if (element.tagName === "IMG") {
    return element;
  }
  return (
    element.querySelector("img") ??
    element.parentElement?.querySelector("img") ??
    null
  );
}

function getImageMenuPosition(
  imageElement: Element,
  editorElement: HTMLElement
): ImageMenuPosition {
  const rect = imageElement.getBoundingClientRect();
  const editorRect = editorElement.getBoundingClientRect();
  return {
    top: rect.top - editorRect.top - 40,
    left: rect.left - editorRect.left + rect.width / 2,
  };
}

export function ImageBubbleMenu({ editor }: ImageBubbleMenuProps) {
  const [menuState, dispatch] = useReducer(
    imageMenuReducer,
    initialImageMenuState
  );

  const setAlignment = (align: ImageAlignment) => {
    editor.chain().focus().updateAttributes("image", { align }).run();
  };

  useEffect(
    function syncImageBubbleMenu() {
      const updateMenu = () => {
        if (!editor.isActive("image")) {
          dispatch({ type: "hide" });
          return;
        }

        const { view } = editor;
        const imageElement = findSelectedImageElement(
          view.domAtPos(view.state.selection.from).node
        );
        if (!imageElement) {
          dispatch({ type: "hide" });
          return;
        }

        dispatch({
          currentAlign: resolveImageAlignment(
            editor.getAttributes("image").align
          ),
          position: getImageMenuPosition(imageElement, view.dom),
          type: "show",
        });
      };

      editor.on("selectionUpdate", updateMenu);
      editor.on("transaction", updateMenu);
      updateMenu();

      return () => {
        editor.off("selectionUpdate", updateMenu);
        editor.off("transaction", updateMenu);
      };
    },
    [editor]
  );

  if (!menuState.isVisible) {
    return null;
  }

  return (
    <div
      className="tiptap-image-bubble-menu pointer-events-auto absolute z-50 -translate-x-1/2"
      style={{ top: menuState.position.top, left: menuState.position.left }}
    >
      <div className="flex items-center gap-1 rounded-lg border bg-background p-1 shadow-lg">
        <Button
          className={cn(
            "size-7 rounded p-0 transition-colors hover:bg-muted",
            menuState.currentAlign === "left" && "bg-muted text-primary"
          )}
          onClick={() => setAlignment("left")}
          size="icon"
          title="Align left"
          type="button"
          variant="ghost"
        >
          <TextAlignLeft className="size-4" />
        </Button>
        <Button
          className={cn(
            "size-7 rounded p-0 transition-colors hover:bg-muted",
            menuState.currentAlign === "center" && "bg-muted text-primary"
          )}
          onClick={() => setAlignment("center")}
          size="icon"
          title="Align center"
          type="button"
          variant="ghost"
        >
          <TextAlignCenter className="size-4" />
        </Button>
        <Button
          className={cn(
            "size-7 rounded p-0 transition-colors hover:bg-muted",
            menuState.currentAlign === "right" && "bg-muted text-primary"
          )}
          onClick={() => setAlignment("right")}
          size="icon"
          title="Align right"
          type="button"
          variant="ghost"
        >
          <TextAlignRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
