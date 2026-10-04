import type { QuestionDraft } from "@reflet/backend/convex/surveys/lib/ai_draft_schema";
import type { SurveyEnding } from "@reflet/survey-core";
import { resolveDraftQuestions } from "@/features/surveys/lib/flow/drafts";
import {
  FLOW_COLUMN_PITCH,
  FLOW_ROW_PITCH,
  flowConnections,
  layoutSurveyFlow,
} from "@/features/surveys/lib/flow/layout";

const GLYPH_PADDING = 6;
const DOT_RADIUS = 3;
const DRAWN_PITCH = 18;

/** A miniature of the template's flow: one dot per step, curves for every path. */
export function FlowGlyph({
  endings,
  questions,
}: {
  endings?: readonly SurveyEnding[];
  questions: readonly QuestionDraft[];
}) {
  const ids = questions.map((_, index) => `q${index}`);
  const resolved = resolveDraftQuestions(questions, ids, endings);
  const layout = layoutSurveyFlow(resolved, endings);
  const minRow = Math.min(...layout.map((node) => node.y / FLOW_ROW_PITCH));
  const pointOf = new Map(
    layout.map((node) => [
      node.id,
      {
        kind: node.kind,
        x: GLYPH_PADDING + (node.x / FLOW_COLUMN_PITCH) * DRAWN_PITCH,
        y: GLYPH_PADDING + (node.y / FLOW_ROW_PITCH - minRow) * DRAWN_PITCH,
      },
    ])
  );
  const points = [...pointOf.values()];
  const width = Math.max(...points.map((point) => point.x)) + GLYPH_PADDING;
  const height = Math.max(...points.map((point) => point.y)) + GLYPH_PADDING;

  return (
    <svg
      aria-hidden
      className="h-10 w-auto max-w-full"
      fill="none"
      viewBox={`0 0 ${width} ${height}`}
    >
      {flowConnections(resolved, endings).map((connection) => {
        const from = pointOf.get(connection.source);
        const to = pointOf.get(connection.target);
        if (!(from && to)) {
          return null;
        }
        const midX = (from.x + to.x) / 2;
        return (
          <path
            className={
              connection.kind === "rule"
                ? "stroke-primary/60"
                : "stroke-muted-foreground/40"
            }
            d={`M${from.x} ${from.y} C${midX} ${from.y} ${midX} ${to.y} ${to.x} ${to.y}`}
            key={connection.id}
            strokeWidth={1.5}
          />
        );
      })}
      {points.map((point) => (
        <circle
          className={
            point.kind === "question"
              ? "fill-foreground/70"
              : "fill-muted-foreground/50"
          }
          cx={point.x}
          cy={point.y}
          key={`${point.x}-${point.y}`}
          r={DOT_RADIUS}
        />
      ))}
    </svg>
  );
}
