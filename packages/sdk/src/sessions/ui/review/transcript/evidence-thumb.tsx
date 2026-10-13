import type { ElementRef, Frame, SessionEvidence } from "../../../protocol";

const TRIGGER_LABELS: Record<SessionEvidence["trigger"], string> = {
  hover: "Long hover",
  manual: "Added by hand",
  mark: "Marked moment",
  navigation: "Page change",
  select: "Pointed element",
  start: "Session start",
};

export function evidenceCaption(evidence: SessionEvidence): string {
  const element = evidence.element ? ` · ${evidence.element.label}` : "";
  return `${TRIGGER_LABELS[evidence.trigger]}${element}`;
}

const hasViewport = (frame: Frame): boolean =>
  frame.viewportWidth > 0 && frame.viewportHeight > 0;

const percent = (value: number, total: number) => `${(value / total) * 100}%`;

export function percentBox(rect: ElementRef["rect"], frame: Frame) {
  if (!hasViewport(frame)) {
    return null;
  }
  return {
    height: percent(rect.height, frame.viewportHeight),
    left: percent(rect.x, frame.viewportWidth),
    top: percent(rect.y, frame.viewportHeight),
    width: percent(rect.width, frame.viewportWidth),
  };
}

export function percentPoint(point: { x: number; y: number }, frame: Frame) {
  if (!hasViewport(frame)) {
    return null;
  }
  return {
    left: percent(point.x, frame.viewportWidth),
    top: percent(point.y, frame.viewportHeight),
  };
}

export function EvidenceThumb({
  evidence,
  isLarge = false,
}: {
  evidence: SessionEvidence;
  isLarge?: boolean;
}) {
  const { element, frame, image } = evidence;
  if (!image?.url) {
    return null;
  }
  const highlight = element && frame ? percentBox(element.rect, frame) : null;
  return (
    <span className="dt-ses-shot" data-large={isLarge}>
      <img
        alt={evidenceCaption(evidence)}
        height={image.height}
        src={image.url}
        width={image.width}
      />
      {highlight && (
        <span
          aria-hidden="true"
          className="dt-ses-shot-mark"
          style={highlight}
        />
      )}
    </span>
  );
}
