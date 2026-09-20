import { REFLET_Z_INDEX } from "../../../z-index";

export const ANNOTATOR_STYLES = `
.overlay { margin: 0; border: 0; padding: 0; width: 100vw; max-width: none; height: 100dvh; max-height: none; position: fixed; inset: 0; z-index: ${REFLET_Z_INDEX.annotatorOverlay}; display: flex; flex-direction: column; background: transparent; color: var(--rf-text); font: 13px/1.45 ui-sans-serif, system-ui, sans-serif; }
.overlay::before { content: ""; position: fixed; inset: 0; z-index: -1; pointer-events: none; background: color-mix(in srgb, var(--rf-bg) 94%, transparent); animation: rf-editor-in 260ms var(--rf-ease); transition: opacity 260ms var(--rf-ease); }
.overlay::backdrop { background: transparent; }
@keyframes rf-editor-in { from { opacity: 0; } }
.editor { flex: 1; position: relative; display: flex; align-items: center; justify-content: center; padding: 20px; min-height: 0; container-type: size; }
.editor-image { width: min(100cqw, calc(100cqh * var(--rf-capture-ratio))); aspect-ratio: var(--rf-capture-ratio); flex: none; position: relative; }
.editor-visual { position: absolute; inset: 0; border-radius: var(--rf-radius); box-shadow: var(--rf-shadow); transform-origin: top left; overflow: hidden; }
.editor-visual img, .editor-visual canvas { position: absolute; inset: 0; width: 100%; height: 100%; border-radius: inherit; object-fit: cover; object-position: top center; outline: 1px solid var(--rf-hairline); outline-offset: -1px; }
.editor-visual canvas { cursor: crosshair; touch-action: none; }
.overlay[data-opening="true"] .editor { pointer-events: none; }
.overlay[data-closing="true"] { pointer-events: none; }
.overlay[data-closing="true"]::before { opacity: 0; }
.overlay[data-closing="true"] .toolbar { opacity: 0; transform: translateY(8px); }

.toolbar { display: flex; align-items: center; justify-content: center; gap: 8px; flex-wrap: wrap; transition: opacity 180ms var(--rf-ease), transform 180ms var(--rf-ease); padding: 4px 12px max(16px, env(safe-area-inset-bottom)); }
.toolbar .group { display: flex; align-items: center; gap: 2px; padding: 4px; border-radius: var(--rf-pill); }
.tool[aria-pressed="true"], .tool[data-selected="true"] { background: var(--rf-primary); color: var(--rf-primary-text); }
.color-picker { position: relative; }
.color-picker summary { display: flex; justify-content: center; align-items: center; }
.color-preview { width: 18px; height: 18px; border-radius: 50%; background: var(--annotation-color); box-shadow: inset 0 0 0 1px var(--rf-border); }
.color-popover { --rf-color-width: 200px; position: absolute; bottom: calc(100% + 14px); left: clamp(calc(12px - var(--rf-color-anchor)), 0px, calc(100vw - var(--rf-color-anchor) - var(--rf-color-width) - 12px)); display: flex; align-items: center; gap: 6px; width: var(--rf-color-width); padding: 4px 4px 4px 14px; border-radius: var(--rf-pill); animation: rf-in 180ms var(--rf-ease); }
.color-picker[data-placement="below"] .color-popover { top: calc(100% + 14px); bottom: auto; }
.color-slider { flex: 1; min-width: 0; }
.color-slider-control { display: flex; align-items: center; height: 40px; width: 100%; touch-action: none; user-select: none; cursor: pointer; }
.color-slider-track { height: 12px; width: 100%; border-radius: var(--rf-pill); background: linear-gradient(to right, var(--rf-swatch-base), var(--annotation-base-color)); box-shadow: inset 0 0 0 1px var(--rf-border); }
.color-slider-thumb { width: 16px; height: 16px; border: 2px solid var(--rf-swatch-base); border-radius: 50%; background: var(--annotation-color); box-shadow: var(--rf-shadow-low); transition: scale 160ms var(--rf-ease); }
.color-slider-thumb[data-dragging] { scale: 1.12; }
.color-slider-thumb:has(:focus-visible) { outline: 2px solid var(--rf-accent); outline-offset: 3px; }
.color-spectrum { position: relative; display: flex; align-items: center; justify-content: center; flex: none; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; }
.color-spectrum::before { content: ""; width: 16px; height: 16px; border-radius: 50%; background: var(--rf-spectrum); box-shadow: inset 0 0 0 1px var(--rf-glass-highlight); }
.color-spectrum:hover { background: var(--rf-bg-hover); }
.color-spectrum button { position: absolute; inset: 0; width: 100%; height: 100%; border-radius: inherit; }
.color-spectrum button:focus-visible { outline: 2px solid var(--rf-accent); outline-offset: 3px; }
.color-spectrum input { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; pointer-events: none; }
.done-btn { display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; padding: 0; border-radius: var(--rf-pill); color: var(--rf-primary-text); background: var(--rf-primary); }
.drawing-menu { position: relative; }
.drawing-popover { position: absolute; z-index: 2; right: 0; bottom: calc(100% + 12px); width: 200px; max-height: calc(50dvh - 68px); overflow-y: auto; padding: 6px; border-radius: var(--rf-radius); }
.drawing-menu[data-placement="below"] .drawing-popover { top: calc(100% + 12px); bottom: auto; }
.drawing-option { display: flex; align-items: center; width: 100%; min-height: 40px; gap: 10px; padding: 0 10px; border-radius: 12px; text-align: left; }
.drawing-option:hover, .drawing-option[aria-pressed="true"] { background: var(--rf-bg-hover); }
.drawing-divider { height: 1px; margin: 5px; background: var(--rf-border); }
.editor canvas[data-tool="text"] { cursor: text; }
.text-annotation-editor { position: fixed; z-index: 3; width: 240px; padding: 8px; border-radius: var(--rf-radius); }
.text-annotation-editor:focus-within { outline: 2px solid var(--rf-accent); outline-offset: 2px; }
.text-annotation-editor textarea { display: block; width: 100%; min-height: 64px; max-height: 112px; padding: 6px; border: 0; background: transparent; resize: vertical; font-size: 16px; line-height: 24px; }
.text-annotation-editor textarea:focus { outline: none; }
.text-annotation-actions { display: flex; align-items: center; justify-content: flex-end; gap: 4px; }
@media (pointer: coarse) {
  .drawing-option { min-height: 44px; }
  .done-btn { width: 44px; height: 44px; }
  .color-popover { --rf-color-width: 232px; padding-left: 16px; }
  .color-slider-control, .color-spectrum { height: 44px; }
  .color-spectrum { width: 44px; }
  .color-slider-thumb, .color-spectrum::before { width: 18px; height: 18px; }
  .editor { padding: 8px; }
  .toolbar { gap: 6px; }
  .toolbar .group { padding: 3px; gap: 0; }
}
@media (pointer: coarse) and (max-width: 360px) {
  .toolbar { gap: 4px; padding-inline: 2px; }
  .toolbar .group { padding: 0; }
}
`;
