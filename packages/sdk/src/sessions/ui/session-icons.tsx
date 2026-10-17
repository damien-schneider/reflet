import { Svg } from "../../feedback/ui/icons";

export function MicIcon() {
  return (
    <Svg>
      <rect height="11" rx="3" width="6" x="9" y="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
    </Svg>
  );
}

export function MarkIcon() {
  return (
    <Svg>
      <path d="M6 21V4h11l-2 4 2 4H6" />
    </Svg>
  );
}

export function PauseIcon() {
  return (
    <Svg>
      <path d="M9 5v14M15 5v14" />
    </Svg>
  );
}

export function PlayIcon() {
  return (
    <Svg>
      <path d="m8 5 11 7-11 7z" />
    </Svg>
  );
}

export function ClockIcon() {
  return (
    <Svg>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </Svg>
  );
}

export function LockIcon() {
  return (
    <Svg>
      <rect height="10" rx="2.5" width="15" x="4.5" y="10.5" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    </Svg>
  );
}

export function TeamIcon() {
  return (
    <Svg>
      <circle cx="9" cy="8.5" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 5.2a3.5 3.5 0 0 1 0 6.6M18.5 14.4a6.5 6.5 0 0 1 3 5.6" />
    </Svg>
  );
}

export function IntentionIcon() {
  return (
    <Svg>
      <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.6.5 1.1 1.3 1.1 2.2h5c0-.9.5-1.7 1.1-2.2A6 6 0 0 0 12 3z" />
    </Svg>
  );
}

export function TranscriptIcon() {
  return (
    <Svg>
      <path d="M4 6h16M4 11h16M4 16h10" />
    </Svg>
  );
}

export function ImageIcon() {
  return (
    <Svg>
      <rect height="16" rx="2.5" width="18" x="3" y="4" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="m21 16-5-5-9 9" />
    </Svg>
  );
}
