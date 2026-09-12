import type {
  Annotation,
  AnnotationTool,
  FeedbackWidgetLabels,
} from "../../types";
import { ArrowIcon, CheckIcon, SquareIcon, TextIcon, UndoIcon } from "../icons";
import { ColorPicker } from "./color-picker";
import type { AnnotationColor } from "./color-value";
import { DrawingToolMenu } from "./tool-menu";

const QUICK_TOOLS = [
  { Icon: SquareIcon, id: "rectangle", label: "Rectangle" },
  { Icon: ArrowIcon, id: "arrow", label: "Arrow" },
  { Icon: TextIcon, id: "text", label: "Text" },
] as const;

export interface AnnotationEditor {
  annotations: Annotation[];
  onChange: (annotations: Annotation[]) => void;
  onDone: () => void;
  onRetake?: () => void;
}

export function AnnotationToolbar({
  editor,
  labels,
  drawing,
}: {
  editor: AnnotationEditor;
  labels: FeedbackWidgetLabels;
  drawing: {
    color: AnnotationColor;
    setColor: (color: AnnotationColor) => void;
    tool: AnnotationTool;
    setTool: (tool: AnnotationTool) => void;
  };
}) {
  return (
    <div className="toolbar">
      <div className="group glass">
        {QUICK_TOOLS.map(({ id, label, Icon }) => (
          <button
            aria-label={label}
            aria-pressed={drawing.tool === id}
            className="tool"
            key={id}
            onClick={() => drawing.setTool(id)}
            title={label}
            type="button"
          >
            <Icon />
          </button>
        ))}
        <DrawingToolMenu drawing={drawing} editor={editor} labels={labels} />
      </div>
      <div className="group glass">
        <ColorPicker onChange={drawing.setColor} selection={drawing.color} />
        <button
          aria-label={labels.undo}
          className="tool"
          disabled={editor.annotations.length === 0}
          onClick={() => editor.onChange(editor.annotations.slice(0, -1))}
          title={labels.undo}
          type="button"
        >
          <UndoIcon />
        </button>
        <button
          aria-label={labels.done}
          className="done-btn"
          onClick={editor.onDone}
          title={labels.done}
          type="button"
        >
          <CheckIcon size={18} />
        </button>
      </div>
    </div>
  );
}
