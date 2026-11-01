import { Button, type ButtonProps } from "@ctrl-ui/react/ui/button";
import { Text } from "@ctrl-ui/react/ui/typography";
import { DIAL_READOUT, type DialSlot, dialSegmentShape } from "./dial-geometry";
import { DialLabel } from "./dial-label";

type DialSegmentProps = Omit<
  ButtonProps,
  "aria-label" | "className" | "slot" | "style"
> & {
  "aria-label": string;
  label?: string;
  place: DialSlot;
  readout?: string;
};

export function DialSegment({
  children,
  label,
  place,
  readout,
  ...props
}: DialSegmentProps) {
  const shape = dialSegmentShape(place);
  return (
    <>
      <Button
        {...props}
        className="live-dial-segment absolute"
        data-focus-ring="none"
        style={{
          clipPath: `path("${shape.path}")`,
          height: shape.height,
          left: shape.left,
          top: shape.top,
          transformOrigin: `${shape.anchor.x}px ${shape.anchor.y}px`,
          width: shape.width,
        }}
      >
        {label ? (
          <DialLabel place={place} shape={shape} text={label} />
        ) : (
          <span
            className="live-dial-segment-icon absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center"
            style={{ left: shape.anchor.x, top: shape.anchor.y }}
          >
            {children}
          </span>
        )}
      </Button>
      <span
        aria-hidden="true"
        className="live-dial-readout pointer-events-none absolute flex items-center justify-center"
        style={DIAL_READOUT}
      >
        <span className="live-dial-chip flex h-full max-w-full items-center rounded-full px-2.5">
          <Text as="span" className="truncate" size="label" weight="medium">
            {readout ?? props["aria-label"]}
          </Text>
        </span>
      </span>
    </>
  );
}
