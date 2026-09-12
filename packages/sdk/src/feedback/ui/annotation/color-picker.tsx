import { Slider } from "@base-ui/react/slider";
import { useId, useRef } from "react";
import { useDetailsPopover } from "../floating/use-details-popover";
import { type AnnotationColor, annotationColorHex } from "./color-value";

interface ColorPickerProps {
  onChange: (color: AnnotationColor) => void;
  selection: AnnotationColor;
}

function ColorSpectrum({ selection, onChange }: ColorPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="color-spectrum">
      <button
        aria-label="Custom color"
        onClick={() => inputRef.current?.click()}
        title="Custom color"
        type="button"
      />
      <input
        aria-hidden="true"
        onChange={(event) =>
          onChange({ baseColor: event.target.value, strengthPercent: 100 })
        }
        ref={inputRef}
        tabIndex={-1}
        type="color"
        value={selection.baseColor}
      />
    </div>
  );
}

function ColorControls({ selection, onChange }: ColorPickerProps) {
  return (
    <div className="color-popover glass">
      <Slider.Root
        className="color-slider"
        onValueChange={(strengthPercent) =>
          onChange({ ...selection, strengthPercent })
        }
        value={selection.strengthPercent}
      >
        <Slider.Control className="color-slider-control">
          <Slider.Track className="color-slider-track">
            <Slider.Thumb
              aria-label="Color strength"
              className="color-slider-thumb"
              getAriaValueText={(_, value) => `${value}% color`}
            />
          </Slider.Track>
        </Slider.Control>
      </Slider.Root>
      <ColorSpectrum onChange={onChange} selection={selection} />
    </div>
  );
}

export function ColorPicker({ selection, onChange }: ColorPickerProps) {
  const popover = useDetailsPopover();
  const id = useId().replaceAll(":", "");
  return (
    <details className="color-picker" id={id} {...popover.detailsProps}>
      <style>{`[id="${id}"] { --rf-color-anchor: ${popover.anchorLeft}px; --annotation-color: ${annotationColorHex(selection)}; --annotation-base-color: ${selection.baseColor}; }`}</style>
      <summary
        aria-label="Annotation color"
        className="tool"
        {...popover.summaryProps}
        title="Annotation color"
      >
        <span className="color-preview" />
      </summary>
      <ColorControls onChange={onChange} selection={selection} />
    </details>
  );
}
