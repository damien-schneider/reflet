import type { Ref } from "react";
import { ChatIcon, CloseIcon } from "./icons";

export function Launcher({
  isOpen,
  label,
  onClick,
  buttonRef,
}: {
  isOpen: boolean;
  label: string;
  onClick: () => void;
  buttonRef?: Ref<HTMLButtonElement>;
}) {
  return (
    <button
      aria-expanded={isOpen}
      className="launcher glass"
      data-open={isOpen}
      onClick={onClick}
      ref={buttonRef}
      type="button"
    >
      <span className="launcher-icon">
        <ChatIcon className="on-open" />
        <CloseIcon className="on-close" />
      </span>
      {label}
    </button>
  );
}
