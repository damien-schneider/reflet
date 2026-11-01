import type { ReactNode } from "react";

export function Svg({
  children,
  className,
  size = 16,
}: {
  children: ReactNode;
  className?: string;
  size?: number;
}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
      width={size}
    >
      {children}
    </svg>
  );
}

export function RefletMarkIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      fill="currentColor"
      height={size}
      viewBox="-1 -1 26 26"
      width={size}
    >
      <path
        clipRule="evenodd"
        d="M12.2 24C13.5 23.8 14.9 23.2 16.2 22.2C16.7 21.9 22.9 15.8 23.2 15.3C24.6 13.5 24.2 10.5 22.2 7.8C21.9 7.4 15.8 1.2 15.3 0.8C13.5 -0.6 10.5 -0.2 7.8 1.8C7.4 2.1 1.2 8.3 0.8 8.7C-0.6 10.6 -0.2 13.6 1.8 16.2C2.1 16.7 8.3 22.9 8.7 23.2C9.6 23.9 10.9 24.2 12.2 24ZM8.9 20.6C6.2 20.3 4.1 18.4 3.5 15.8L3.4 15.4L3.3 12.2C3.3 9.1 3.3 8.9 3.4 8.4C3.9 5.8 5.8 3.9 8.4 3.4C8.9 3.3 9.1 3.3 12.2 3.3L15.4 3.4L15.8 3.5C18.5 4.1 20.3 6.2 20.6 9C20.7 9.8 20.6 15.1 20.5 15.5C20 18.3 17.8 20.3 15 20.6C14.6 20.6 9.3 20.6 8.9 20.6Z"
        fillRule="evenodd"
      />
    </svg>
  );
}

export function ChatIcon({ className }: { className?: string }) {
  return (
    <Svg className={className} size={15}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </Svg>
  );
}

export function CloseIcon({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="M18 6 6 18M6 6l12 12" />
    </Svg>
  );
}

export function CameraIcon() {
  return (
    <Svg>
      <path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2.2l1.2-2h8.2l1.2 2h2.2A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5z" />
      <circle cx="12" cy="13" r="3.2" />
    </Svg>
  );
}

export function PencilIcon() {
  return (
    <Svg>
      <path d="M16.5 4.5a2.1 2.1 0 0 1 3 3L8 19l-4 1 1-4z" />
    </Svg>
  );
}

export function TargetIcon() {
  return (
    <Svg>
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
      <circle cx="12" cy="12" r="5" />
    </Svg>
  );
}

export function TrashIcon() {
  return (
    <Svg>
      <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13M10 11v5M14 11v5" />
    </Svg>
  );
}

export function ArrowIcon() {
  return (
    <Svg>
      <path d="M5 19 19 5M11 5h8v8" />
    </Svg>
  );
}

export function ArrowLeftIcon() {
  return (
    <Svg>
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </Svg>
  );
}

export function UndoIcon() {
  return (
    <Svg>
      <path d="M4 9h11a5 5 0 0 1 0 10h-5M4 9l4-4M4 9l4 4" />
    </Svg>
  );
}

export function CodeIcon() {
  return (
    <Svg>
      <path d="m8 7-5 5 5 5M16 7l5 5-5 5" />
    </Svg>
  );
}

export function CopyIcon() {
  return (
    <Svg>
      <rect height="12" rx="2" width="12" x="9" y="9" />
      <path d="M15 9V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h4" />
    </Svg>
  );
}

export function CheckIcon({ size = 28 }: { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.4"
      viewBox="0 0 24 24"
      width={size}
    >
      <path d="m5 13 4 4L19 7" />
    </svg>
  );
}

export function GripIcon() {
  return (
    <Svg>
      <path d="M9 5h.01M15 5h.01M9 12h.01M15 12h.01M9 19h.01M15 19h.01" />
    </Svg>
  );
}
export function MinusIcon() {
  return (
    <Svg>
      <path d="M5 12h14" />
    </Svg>
  );
}
export function MoreIcon() {
  return (
    <Svg>
      <path d="M5 12h.01M12 12h.01M19 12h.01" />
    </Svg>
  );
}

export function ChevronDownIcon() {
  return (
    <Svg>
      <path d="m7 10 5 5 5-5" />
    </Svg>
  );
}

export function SquareIcon() {
  return (
    <Svg>
      <rect height="14" rx="2" width="14" x="5" y="5" />
    </Svg>
  );
}
export function TextIcon() {
  return (
    <Svg>
      <path d="M5 6V4h14v2M12 4v16M8 20h8" />
    </Svg>
  );
}
export function SpotlightIcon() {
  return (
    <Svg>
      <path d="M8 4H4v4M16 4h4v4M4 16v4h4M20 16v4h-4" />
      <rect height="8" rx="1" width="8" x="8" y="8" />
    </Svg>
  );
}
export function HighlightIcon() {
  return (
    <Svg>
      <path d="M4 19h16M8 15l8-11 4 3-8 11-4-3ZM7 15l-2 3" />
    </Svg>
  );
}
export function BlurIcon() {
  return (
    <Svg>
      <rect height="14" rx="2" width="14" x="5" y="5" />
      <path d="M8 8h8v8H8z" />
    </Svg>
  );
}
