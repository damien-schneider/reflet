import type { ReactNode } from "react";

function Svg({
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

export function BugIcon() {
  return (
    <Svg size={14}>
      <path d="M8 6a4 4 0 0 1 8 0M6 10h12v4a6 6 0 0 1-12 0zM3 12h3M18 12h3M4.5 6.5 7 8M19.5 6.5 17 8M4.5 17.5 7 16M19.5 17.5 17 16" />
    </Svg>
  );
}

export function IdeaIcon() {
  return (
    <Svg size={14}>
      <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.5.4.8.9.9 1.5l.1.7h5.2l.1-.7c.1-.6.4-1.1.9-1.5A6 6 0 0 0 12 3" />
    </Svg>
  );
}

export function QuestionIcon() {
  return (
    <Svg size={14}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.6 9.4a2.5 2.5 0 1 1 3.3 2.4c-.6.2-.9.8-.9 1.4v.3M12 17h.01" />
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

export function SquareIcon() {
  return (
    <Svg>
      <rect height="13" rx="1.5" width="16" x="4" y="5.5" />
    </Svg>
  );
}

export function HighlightIcon() {
  return (
    <Svg>
      <path d="M4 15h16M6 5h12v7H6z" />
    </Svg>
  );
}

export function BlurIcon() {
  return (
    <Svg>
      <path d="M12 3c3.5 4 5.5 6.6 5.5 9.2A5.5 5.5 0 0 1 6.5 12.2C6.5 9.6 8.5 7 12 3" />
      <path d="M9 13h.01M12 15h.01M15 12h.01" />
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
