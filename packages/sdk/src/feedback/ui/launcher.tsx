import { ChatIcon, CloseIcon } from "./icons";

/**
 * Never changes size between states — the panel opening must not move the
 * button out from under the pointer.
 */
export function Launcher({
  isOpen,
  label,
  onClick,
}: {
  isOpen: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-expanded={isOpen}
      className="launcher"
      data-open={isOpen}
      onClick={onClick}
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
