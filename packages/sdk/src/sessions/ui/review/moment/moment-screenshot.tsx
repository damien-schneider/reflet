import type { SegmentContext, SessionEvidence } from "../../../protocol";
import { formatClock, preciseSeconds } from "../../session-format";
import { percentBox, percentPoint } from "../transcript/evidence-thumb";

const OTHER_STATE_CAPTION =
  "This screenshot was not taken at this moment: it may show another state of the page.";

function approximateCaption(offsetMs: number | null): string {
  if (offsetMs === null) {
    return "Approximate — screenshot taken at another moment";
  }
  const direction = offsetMs >= 0 ? "after" : "before";
  return `Approximate — screenshot taken ${preciseSeconds(offsetMs)} ${direction}`;
}

function overlayFor(item: SegmentContext) {
  const { element, evidenceMatch, frame, pointer } = item;
  if (!(evidenceMatch && frame)) {
    return null;
  }
  const outline = element ? percentBox(element.rect, frame) : null;
  const dot =
    evidenceMatch === "exact" && pointer ? percentPoint(pointer, frame) : null;
  return outline ? { dot, match: evidenceMatch, outline } : null;
}

function screenshotAlt(item: SegmentContext, evidence: SessionEvidence) {
  const time = formatClock(evidence.capturedAtMs ?? evidence.atMs);
  const element = item.element?.label;
  if (!(element && overlayFor(item))) {
    return `Screenshot at ${time}`;
  }
  const precision =
    item.evidenceMatch === "approximate" ? " approximately" : "";
  return `Screenshot at ${time}, “${element}” outlined${precision}`;
}

function screenshotCaption(item: SegmentContext): string | null {
  if (item.evidenceMatch === "approximate") {
    return approximateCaption(item.evidenceOffsetMs);
  }
  return item.evidenceMatch === "exact" ? null : OTHER_STATE_CAPTION;
}

function MissingScreenshot({ evidence }: { evidence: SessionEvidence | null }) {
  const reason = evidence?.missingReason;
  return (
    <p className="dt-meta">
      {reason ? `Screenshot removed: ${reason}` : "Screenshot removed"}
    </p>
  );
}

export function MomentScreenshot({
  evidence,
  item,
}: {
  evidence: SessionEvidence | null;
  item: SegmentContext;
}) {
  const image = evidence?.status === "available" ? evidence.image : null;
  if (!(evidence && image?.url)) {
    return <MissingScreenshot evidence={evidence} />;
  }
  const overlay = overlayFor(item);
  const caption = screenshotCaption(item);
  return (
    <figure className="dt-ses-moment-shot">
      <span className="dt-ses-shot" data-large="true">
        <img
          alt={screenshotAlt(item, evidence)}
          decoding="async"
          height={image.height}
          loading="lazy"
          src={image.url}
          width={image.width}
        />
        {overlay && (
          <span
            aria-hidden="true"
            className="dt-ses-shot-mark"
            data-match={overlay.match}
            style={overlay.outline}
          />
        )}
        {overlay?.dot && (
          <span
            aria-hidden="true"
            className="dt-ses-shot-pointer"
            style={overlay.dot}
          />
        )}
      </span>
      {caption && <figcaption className="dt-meta">{caption}</figcaption>}
    </figure>
  );
}
