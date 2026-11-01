import {
  DIAL_SIZE,
  type DialSegmentShape,
  type DialSlot,
  dialLabelArc,
} from "./dial-geometry";
import { useSvgId } from "./dial-tracks";

const AVERAGE_CHARACTER_WIDTH = 6.4;

const fitOnArc = (text: string, arcLength: number): string => {
  const room = Math.floor(arcLength / AVERAGE_CHARACTER_WIDTH);
  return text.length <= room
    ? text
    : `${text.slice(0, Math.max(room - 1, 1)).trimEnd()}…`;
};

export function DialLabel({
  place,
  shape,
  text,
}: {
  place: DialSlot;
  shape: DialSegmentShape;
  text: string;
}) {
  const id = `live-dial-label-${useSvgId()}`;
  const arc = dialLabelArc(place);
  return (
    <svg
      aria-hidden="true"
      className="live-dial-label pointer-events-none absolute overflow-visible"
      style={{
        height: DIAL_SIZE,
        left: -shape.left,
        top: -shape.top,
        width: DIAL_SIZE,
      }}
      viewBox={`0 0 ${DIAL_SIZE} ${DIAL_SIZE}`}
    >
      <path d={arc.path} fill="none" id={id} />
      <text dominantBaseline="central">
        <textPath href={`#${id}`} startOffset="50%" textAnchor="middle">
          {fitOnArc(text, arc.length)}
        </textPath>
      </text>
    </svg>
  );
}
