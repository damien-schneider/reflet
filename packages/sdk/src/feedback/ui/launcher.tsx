import { ChatIcon, CloseIcon } from "./icons";

export function Launcher({
  compact,
  isOpen,
  label,
  onClick,
}: {
  compact: boolean;
  isOpen: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-expanded={isOpen}
      aria-label={label}
      className="launcher"
      data-compact={compact || isOpen ? "true" : "false"}
      onClick={onClick}
      type="button"
    >
      {isOpen ? <CloseIcon /> : <ChatIcon />}
      {!(compact || isOpen) && label}
    </button>
  );
}
