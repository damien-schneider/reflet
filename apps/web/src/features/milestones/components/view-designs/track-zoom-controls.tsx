"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ctrl-ui/react/ui/tooltip";
import {
  ArrowCounterClockwise,
  MagnifyingGlassMinus,
  MagnifyingGlassPlus,
} from "@phosphor-icons/react";

interface TrackZoomControlsProps {
  base: number;
  max: number;
  min: number;
  onChange: (width: number) => void;
  value: number;
}

const ZOOM_STEP = 40;
const PERCENT = 100;

export function TrackZoomControls({
  value,
  base,
  min,
  max,
  onChange,
}: TrackZoomControlsProps) {
  const zoomPercent = Math.round((value / base) * PERCENT);

  return (
    <div className="hidden items-center justify-end gap-1 md:flex">
      <ZoomButton
        disabled={value <= min}
        icon={<MagnifyingGlassMinus />}
        label="Zoom out track"
        onClick={() => onChange(Math.max(min, value - ZOOM_STEP))}
      />
      <span className="w-12 text-center text-caption text-muted-foreground tabular-nums">
        {zoomPercent}%
      </span>
      <ZoomButton
        disabled={value >= max}
        icon={<MagnifyingGlassPlus />}
        label="Zoom in track"
        onClick={() => onChange(Math.min(max, value + ZOOM_STEP))}
      />
      <ZoomButton
        disabled={value === base}
        icon={<ArrowCounterClockwise />}
        label="Reset track zoom"
        onClick={() => onChange(base)}
      />
    </div>
  );
}

function ZoomButton({
  disabled,
  icon,
  label,
  onClick,
}: {
  disabled?: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            aria-label={label}
            disabled={disabled}
            iconOnly
            onClick={onClick}
            size="xs"
            variant="ghost"
          >
            {icon}
          </Button>
        }
      />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
