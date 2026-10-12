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

export function PersonIcon() {
  return (
    <Svg>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </Svg>
  );
}
