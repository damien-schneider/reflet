import type { SessionEvidence } from "../../../protocol";

const TRIGGER_LABELS: Record<SessionEvidence["trigger"], string> = {
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

function highlightStyle(evidence: SessionEvidence) {
  const { element, frame } = evidence;
  if (
    !(element && frame) ||
    frame.viewportWidth === 0 ||
    frame.viewportHeight === 0
  ) {
    return null;
  }
  const percent = (value: number, total: number) => `${(value / total) * 100}%`;
  return {
    height: percent(element.rect.height, frame.viewportHeight),
    left: percent(element.rect.x, frame.viewportWidth),
    top: percent(element.rect.y, frame.viewportHeight),
    width: percent(element.rect.width, frame.viewportWidth),
  };
}

export function EvidenceThumb({
  evidence,
  isLarge = false,
}: {
  evidence: SessionEvidence;
  isLarge?: boolean;
}) {
  const { image } = evidence;
  if (!image?.url) {
    return null;
  }
  const highlight = highlightStyle(evidence);
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
