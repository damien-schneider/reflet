"use client";

/**
 * Reflet SDK — floating feedback widget.
 *
 * @example
 * ```tsx
 * import { RefletFeedback } from 'reflet-sdk/feedback';
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <>
 *       {children}
 *       <RefletFeedback publicKey={process.env.NEXT_PUBLIC_REFLET_KEY} />
 *     </>
 *   );
 * }
 * ```
 */

// biome-ignore lint/performance/noBarrelFile: published entry point for `reflet-sdk/feedback`
export { captureViewport, releaseCapture } from "./core/capture";
export { buildElementSelection } from "./core/element-selector";
export { collectPageContext } from "./core/page-context";
export type {
  Annotation,
  AnnotationTool,
  CapturedImage,
  FeedbackWidgetCategory,
  FeedbackWidgetLabels,
  RefletFeedbackProps,
} from "./types";
export { RefletFeedback } from "./widget";
