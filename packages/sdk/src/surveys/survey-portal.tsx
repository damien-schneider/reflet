import type { SurveyPosition } from "@reflet/survey-core";
import { type ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { REFLET_Z_INDEX } from "../z-index";

export const SURVEY_HOST_ATTRIBUTE = "data-reflet-survey";

const LAYER_STYLES = `
:host { all: initial; }
.rfs-layer {
  position: fixed;
  z-index: ${REFLET_Z_INDEX.surveyLayer};
  bottom: 20px;
  width: min(360px, calc(100vw - 32px));
}
.rfs-layer[data-position="bottom_right"] { right: 20px; }
.rfs-layer[data-position="bottom_left"] { left: 20px; }
.rfs-layer[data-position="center"] {
  inset: 0;
  display: grid;
  place-items: center;
  width: auto;
  padding: 16px;
  background: rgb(15 15 15 / 28%);
  animation: rfs-layer-fade 240ms ease-out;
}
.rfs-layer[data-position="center"] > .rf-survey { max-width: 420px; }
@media (max-width: 480px) {
  .rfs-layer[data-position^="bottom"] { right: 16px; bottom: 16px; left: 16px; width: auto; }
}
@keyframes rfs-layer-fade { from { opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .rfs-layer { animation: none; } }
`;

/**
 * Hosts an in-app survey in its own shadow root so page CSS can't restyle it.
 * Direct DOM work is unavoidable: React can't create a shadow root declaratively.
 */
export function SurveyPortal({
  children,
  position,
}: {
  children: ReactNode;
  position: SurveyPosition;
}) {
  const [shadowRoot, setShadowRoot] = useState<ShadowRoot | null>(null);

  useEffect(() => {
    const host = document.createElement("div");
    host.setAttribute(SURVEY_HOST_ATTRIBUTE, "");
    const root = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = LAYER_STYLES;
    root.append(style);
    document.body.append(host);
    setShadowRoot(root);
    return () => host.remove();
  }, []);

  if (!shadowRoot) {
    return null;
  }
  return createPortal(
    <div className="rfs-layer" data-position={position}>
      {children}
    </div>,
    shadowRoot
  );
}
