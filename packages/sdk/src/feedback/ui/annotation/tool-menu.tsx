import type { AnnotationTool, FeedbackWidgetLabels } from "../../types";
import { useDetailsPopover } from "../floating/use-details-popover";
import {
  BlurIcon,
  CameraIcon,
  ChevronDownIcon,
  HighlightIcon,
  PencilIcon,
  SpotlightIcon,
  TrashIcon,
} from "../icons";
import type { AnnotationEditor } from "./toolbar";

const EXTRA_TOOLS = [
  { Icon: SpotlightIcon, id: "spotlight", label: "Spotlight" },
  { Icon: PencilIcon, id: "pen", label: "Draw" },
  { Icon: HighlightIcon, id: "highlight", label: "Highlight" },
  { Icon: BlurIcon, id: "blur", label: "Hide" },
] as const;

export function DrawingToolMenu({
  drawing,
  editor,
  labels,
}: {
  drawing: { tool: AnnotationTool; setTool: (tool: AnnotationTool) => void };
  editor: AnnotationEditor;
  labels: FeedbackWidgetLabels;
}) {
  const popover = useDetailsPopover();
  return (
    <details className="drawing-menu" {...popover.detailsProps}>
      <summary
        aria-label="More drawing tools"
        className="tool"
        data-selected={EXTRA_TOOLS.some(({ id }) => id === drawing.tool)}
        title="More drawing tools"
        {...popover.summaryProps}
      >
        <ChevronDownIcon />
      </summary>
      <div className="drawing-popover glass">
        {EXTRA_TOOLS.map(({ id, label, Icon }) => (
          <button
            aria-pressed={drawing.tool === id}
            className="drawing-option"
            key={id}
            onClick={() => {
              drawing.setTool(id);
              popover.hide();
            }}
            type="button"
          >
            <Icon />
            {label}
          </button>
        ))}
        <div className="drawing-divider" />
        <button
          className="drawing-option"
          disabled={editor.annotations.length === 0}
          onClick={() => {
            editor.onChange([]);
            popover.hide();
          }}
          type="button"
        >
          <TrashIcon />
          {labels.clearAnnotations}
        </button>
        {editor.onRetake && (
          <button
            className="drawing-option"
            onClick={editor.onRetake}
            type="button"
          >
            <CameraIcon />
            {labels.recapture}
          </button>
        )}
      </div>
    </details>
  );
}
