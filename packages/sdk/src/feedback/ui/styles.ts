import { REFLET_Z_INDEX } from "../../z-index";
import { DEFAULT_WIDGET_OFFSET } from "../types";
import { ANNOTATOR_STYLES } from "./annotation/styles";
import { COMPOSER_STYLES } from "./composer/styles";
import { PICKER_STYLES } from "./floating/picker-styles";

export const WIDGET_STYLES = `
:host {
  --rf-offset: ${DEFAULT_WIDGET_OFFSET}px;
  --rf-bg: #ffffff;
  --rf-bg-subtle: rgb(55 53 47 / 4%);
  --rf-bg-hover: rgb(55 53 47 / 7%);
  --rf-border: rgb(55 53 47 / 9%);
  --rf-hairline: rgb(15 15 15 / 10%);
  --rf-text: #37352f;
  --rf-text-muted: rgb(55 53 47 / 68%);
  --rf-primary: #37352f;
  --rf-primary-text: #ffffff;
  --rf-accent: #2383e2;
  --rf-accent-text: #ffffff;
  --rf-danger: #d44c47;
  --rf-success: #448361;
  --rf-swatch-base: #ffffff;
  --rf-spectrum: conic-gradient(#ff5757, #ffde59, #6bdb78, #4ac9fa, #8b5cf6, #ef73dc, #ff5757);
  --rf-radius: 20px;
  --rf-pill: 999px;
  --rf-attachment-height: 78px;
  --rf-width: 360px;
  --rf-glass: rgb(255 255 255 / 72%);
  --rf-glass-highlight: rgb(255 255 255 / 90%);
  --rf-glass-stroke: rgb(255 255 255 / 70%);
  --rf-radius-sm: 8px;
  --rf-shadow-inset: inset 0 0 0 1px var(--rf-border);
  --rf-ring: 0 0 0 1px rgb(15 15 15 / 4%);
  --rf-shadow-low: 0 1px 2px rgb(15 15 15 / 6%), 0 4px 10px -4px rgb(15 15 15 / 10%);
  --rf-shadow: 0 2px 5px -1px rgb(15 15 15 / 7%), 0 12px 32px -8px rgb(15 15 15 / 16%);
  --rf-shadow-float: 0 4px 12px -3px rgb(15 15 15 / 35%);
  --rf-ease: cubic-bezier(0.16, 1, 0.3, 1);
  color-scheme: light;
  all: initial;
  font-family: var(--rf-font, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif);
}

:host([data-theme="dark"]) {
  --rf-bg: #202020;
  --rf-bg-subtle: rgb(255 255 255 / 5%);
  --rf-bg-hover: rgb(255 255 255 / 9%);
  --rf-border: rgb(255 255 255 / 9%);
  --rf-hairline: rgb(255 255 255 / 12%);
  --rf-text: #ebeae8;
  --rf-text-muted: rgb(255 255 255 / 68%);
  --rf-glass: rgb(32 32 32 / 78%);
  --rf-glass-highlight: rgb(255 255 255 / 14%);
  --rf-glass-stroke: rgb(255 255 255 / 12%);
  --rf-primary: #f1efec;
  --rf-primary-text: #1c1c1b;
  --rf-accent: #529cca;
  --rf-danger: #eb5757;
  --rf-success: #4dab74;
  --rf-ring: 0 0 0 1px rgb(255 255 255 / 7%);
  --rf-shadow-low: 0 1px 2px rgb(0 0 0 / 30%), 0 4px 10px -4px rgb(0 0 0 / 40%);
  --rf-shadow: 0 2px 5px -1px rgb(0 0 0 / 35%), 0 14px 36px -10px rgb(0 0 0 / 55%);
  --rf-shadow-float: 0 4px 14px -3px rgb(0 0 0 / 55%);
  color-scheme: dark;
}

*, *::before, *::after { box-sizing: border-box; }


.root {
  position: fixed;
  z-index: ${REFLET_Z_INDEX.widgetRoot};
  display: flex;
  align-items: flex-end;
  gap: 8px;
  font: 13px/1.45 var(--rf-font, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif);
  color: var(--rf-text);
}
.root:has(.panel) { width: min(var(--rf-width), calc(var(--rf-viewport-width, 100vw) - 24px)); }
.root[data-position$="right"] { right: calc(var(--rf-viewport-right, 0px) + max(12px, min(var(--rf-offset), calc((var(--rf-viewport-width, 100vw) - var(--rf-width)) / 2)))); }
.root[data-position$="left"] { left: calc(var(--rf-viewport-left, 0px) + max(12px, min(var(--rf-offset), calc((var(--rf-viewport-width, 100vw) - var(--rf-width)) / 2)))); }
.root[data-position^="bottom"] { bottom: calc(var(--rf-viewport-bottom, 0px) + max(var(--rf-offset), env(safe-area-inset-bottom))); }
.root[data-position^="top"] { top: calc(var(--rf-viewport-top, 0px) + max(var(--rf-offset), env(safe-area-inset-top))); align-items: flex-start; }
.root[data-position="bottom-right"] .panel { transform-origin: bottom right; }
.root[data-position="bottom-left"] .panel { transform-origin: bottom left; }
.root[data-position^="top"] .panel { transform-origin: top center; }
.root[data-editing="true"] { visibility: hidden; pointer-events: none; }
button, select, input, textarea { font: inherit; color: inherit; }
button { margin: 0; cursor: pointer; border: 0; background: none; transition: scale 120ms var(--rf-ease); }
button:disabled { cursor: not-allowed; opacity: .4; }
button:active:not(:disabled) { scale: .97; }
svg { flex-shrink: 0; }
:focus-visible { outline: 2px solid var(--rf-accent); outline-offset: 3px; }
.icon-btn, .tool {
  display: inline-flex; align-items: center; justify-content: center;
  width: 40px; height: 40px; flex: none; border-radius: var(--rf-pill); color: var(--rf-text-muted);
  transition: background 160ms var(--rf-ease), color 160ms var(--rf-ease), scale 120ms var(--rf-ease);
}
.icon-btn:hover, .tool:hover { background: var(--rf-bg-hover); color: var(--rf-text); }
.launcher {
  display: inline-flex; align-items: center; gap: 7px; height: 40px; padding: 0 15px;
  border-radius: var(--rf-pill); color: var(--rf-text);
  font-weight: 500;
  transition: transform 200ms var(--rf-ease), box-shadow 200ms var(--rf-ease), scale 120ms var(--rf-ease);
}
.launcher:hover { transform: translateY(-2px); box-shadow: var(--rf-shadow); }
.launcher-icon { display: flex; width: 15px; height: 15px; }
.launcher-icon .on-close { display: none; }
.floating-controls {
  display: flex; align-items: center; flex: none;
  margin-right: auto; padding-left: 3px;
  animation: rf-in 220ms var(--rf-ease);
}
.drag-handle { touch-action: none; cursor: grab; }
.drag-handle:active { cursor: grabbing; }
.truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ghost-btn { display: flex; align-items: center; gap: 8px; min-height: 40px; padding: 0 8px; border-radius: var(--rf-radius-sm); }
.ghost-btn:hover { background: var(--rf-bg-hover); }
.error { margin: 0; padding: 10px 14px; border-radius: var(--rf-radius); font-size: 12px; color: var(--rf-danger); }
.done { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 24px; text-align: center; }
.done svg { color: var(--rf-success); }
.done h2 { margin: 0; font-size: 14px; font-weight: 600; }
.done p { margin: 0; font-size: 12px; color: var(--rf-text-muted); }
.spinner { width: 14px; height: 14px; border: 2px solid currentColor; border-right-color: transparent; border-radius: 50%; animation: rf-spin 700ms linear infinite; }
.hp { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
@keyframes rf-spin { to { transform: rotate(360deg); } }
@keyframes rf-in { from { opacity: 0; transform: translateY(5px) scale(.98); } }
@keyframes rf-fade { from { opacity: 0; } }
@media (pointer: coarse) {
  .icon-btn, .tool { width: 44px; height: 44px; }
  .launcher, .ghost-btn { min-height: 44px; }
}
.glass {
  position: relative;
  isolation: isolate;
  border: 1px solid var(--rf-glass-stroke);
  box-shadow: inset 0 1px 0 var(--rf-glass-highlight), var(--rf-shadow);
}
.glass::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  border-radius: inherit;
  background: var(--rf-bg);
  pointer-events: none;
}
@supports (backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)) {
  .glass::before {
    background: var(--rf-glass);
    -webkit-backdrop-filter: blur(20px) saturate(1.6);
    backdrop-filter: blur(20px) saturate(1.6);
  }
}
@media (prefers-reduced-transparency: reduce), (prefers-contrast: more) {
  .glass::before { background: var(--rf-bg); backdrop-filter: none; -webkit-backdrop-filter: none; }
}
.capture-halo { position: fixed; inset: 0; z-index: ${REFLET_Z_INDEX.captureHalo}; pointer-events: none; opacity: 0; transition: opacity 500ms var(--rf-ease); }
.capture-halo[data-active="true"] { opacity: 1; transition-duration: 140ms; }
.capture-halo::before { content: ""; position: absolute; inset: 0; border-radius: 20px; box-shadow: inset 14px 0 36px -16px var(--rf-accent), inset -14px 0 36px -16px var(--rf-accent), inset 0 0 4px 1px color-mix(in srgb, var(--rf-accent) 35%, transparent); }
.capture-halo::after { content: ""; position: absolute; inset: 0; background: linear-gradient(90deg, color-mix(in srgb, var(--rf-accent) 20%, transparent), transparent 5%, transparent 95%, color-mix(in srgb, var(--rf-accent) 20%, transparent)); }
${COMPOSER_STYLES}
${ANNOTATOR_STYLES}
${PICKER_STYLES}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
  button:active:not(:disabled) { scale: 1; }
}
`;
