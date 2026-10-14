import {
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { CheckIcon } from "../../feedback/ui/icons";
import { focusedElementAround } from "./focused-element";

export interface MenuItem {
  /** Present on every item of a single-choice menu: the item reads as a radio. */
  checked?: boolean;
  label: string;
  onSelect: () => void;
  variant?: "danger";
}

export interface MenuTrigger {
  className: string;
  content: ReactNode;
  label: string;
}

const MENU_ITEM_SELECTOR = '[role^="menuitem"]';

function nextIndex(key: string, current: number, count: number): number | null {
  if (key === "ArrowDown") {
    return (current + 1) % count;
  }
  if (key === "ArrowUp") {
    return (current - 1 + count) % count;
  }
  if (key === "Home") {
    return 0;
  }
  if (key === "End") {
    return count - 1;
  }
  return null;
}

function useCloseOnOutsidePointer(
  containerRef: RefObject<HTMLElement | null>,
  options: { close: () => void; isOpen: boolean }
) {
  const closeRef = useRef(options.close);
  useLayoutEffect(() => {
    closeRef.current = options.close;
  });
  const { isOpen } = options;
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const closeOnOutsidePointer = (event: Event) => {
      const container = containerRef.current;
      if (container && !event.composedPath().includes(container)) {
        closeRef.current();
      }
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer, true);
    return () =>
      document.removeEventListener("pointerdown", closeOnOutsidePointer, true);
  }, [containerRef, isOpen]);
}

function useFocusOnOpen(
  listRef: RefObject<HTMLElement | null>,
  isOpen: boolean
) {
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!(isOpen && list)) {
      return;
    }
    const items = [...list.querySelectorAll<HTMLElement>(MENU_ITEM_SELECTOR)];
    const checked = items.find(
      (item) => item.getAttribute("aria-checked") === "true"
    );
    (checked ?? items[0])?.focus({ preventScroll: true });
  }, [isOpen, listRef]);
}

/** Native: the panel's Escape listener shares the shadow root with React's, and runs before React's handler. */
function useEscapeToClose(
  listRef: RefObject<HTMLElement | null>,
  options: { isOpen: boolean; onEscape: () => void }
) {
  const { isOpen, onEscape } = options;
  useEffect(() => {
    const list = listRef.current;
    if (!(isOpen && list)) {
      return;
    }
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape" && !event.isComposing) {
        event.stopPropagation();
        onEscape();
      }
    };
    list.addEventListener("keydown", closeOnEscape);
    return () => list.removeEventListener("keydown", closeOnEscape);
  }, [isOpen, listRef, onEscape]);
}

function MenuItemButton({
  hasChoices,
  item,
  onChosen,
}: {
  hasChoices: boolean;
  item: MenuItem;
  onChosen: () => void;
}) {
  const select = () => {
    onChosen();
    item.onSelect();
  };
  if (!hasChoices) {
    return (
      <button
        className="dt-menu-item"
        data-variant={item.variant}
        onClick={select}
        role="menuitem"
        tabIndex={-1}
        type="button"
      >
        {item.label}
      </button>
    );
  }
  return (
    <button
      aria-checked={item.checked === true}
      className="dt-menu-item"
      onClick={select}
      role="menuitemradio"
      tabIndex={-1}
      type="button"
    >
      <span className="dt-menu-check">
        {item.checked && <CheckIcon size={14} />}
      </span>
      {item.label}
    </button>
  );
}

export function Menu({
  items,
  placement = "below",
  trigger,
}: {
  items: MenuItem[];
  placement?: "above" | "below";
  trigger: MenuTrigger;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const menuId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const close = () => setIsOpen(false);
  const closeAndRefocus = () => {
    close();
    triggerRef.current?.focus({ preventScroll: true });
  };
  useCloseOnOutsidePointer(containerRef, { close, isOpen });
  useFocusOnOpen(listRef, isOpen);
  useEscapeToClose(listRef, { isOpen, onEscape: closeAndRefocus });
  const hasChoices = items.some((item) => item.checked !== undefined);

  const moveWithKeys = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Tab") {
      close();
      return;
    }
    const list = event.currentTarget;
    const options = [...list.querySelectorAll<HTMLElement>(MENU_ITEM_SELECTOR)];
    const focused = focusedElementAround(list);
    const current =
      focused instanceof HTMLElement ? options.indexOf(focused) : -1;
    const index = nextIndex(event.key, current, options.length);
    if (index !== null) {
      event.preventDefault();
      options[index]?.focus();
    }
  };

  return (
    <div className="dt-menu" ref={containerRef}>
      <button
        aria-controls={isOpen ? menuId : undefined}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={trigger.label}
        className={trigger.className}
        onClick={() => setIsOpen(!isOpen)}
        ref={triggerRef}
        title={trigger.label}
        type="button"
      >
        {trigger.content}
      </button>
      {isOpen && (
        <div
          aria-label={trigger.label}
          className="dt-menu-list"
          data-placement={placement}
          id={menuId}
          onKeyDown={moveWithKeys}
          ref={listRef}
          role="menu"
        >
          {items.map((item) => (
            <MenuItemButton
              hasChoices={hasChoices}
              item={item}
              key={item.label}
              onChosen={closeAndRefocus}
            />
          ))}
        </div>
      )}
    </div>
  );
}
