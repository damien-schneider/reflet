import { REFLET_Z_INDEX } from "../../z-index";

const MONO_FONT = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

export const DEVTOOLS_STYLES = `
.dt { font: 13px/1.45 var(--rf-font, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif); color: var(--rf-text); }
.dt[data-recessed="true"] .dt-bar, .dt[data-recessed="true"] .dt-sheet { visibility: hidden; pointer-events: none; }
.dt-pin {
  position: fixed; z-index: ${REFLET_Z_INDEX.widgetRoot}; top: 0; left: 0;
  display: flex; align-items: center; justify-content: center;
  min-width: 24px; height: 24px; padding: 0 7px;
  border-radius: 12px 12px 12px 3px; background: var(--rf-accent); color: var(--rf-accent-text);
  font-size: 11.5px; font-weight: 650; box-shadow: 0 0 0 2px var(--rf-bg), var(--rf-shadow-low);
  animation: dt-pin-in 260ms var(--rf-ease);
  transition: scale 140ms var(--rf-ease), opacity 160ms var(--rf-ease);
}
.dt-pin:hover, .dt-pin[aria-expanded="true"] { scale: 1.12; }
.dt-pin[data-sent="true"] { background: var(--rf-text-muted); }
.dt-pin-badge { display: inline-flex; flex: none; align-items: center; justify-content: center; min-width: 20px; height: 20px; padding: 0 6px; border-radius: 10px 10px 10px 3px; background: var(--rf-accent); color: var(--rf-accent-text); font-size: 10.5px; font-weight: 650; }
.dt-card[data-sent="true"] .dt-pin-badge { background: var(--rf-text-muted); }
.dt-pin[data-locating="true"] { animation: dt-pin-in 260ms var(--rf-ease), dt-pin-pulse 1.2s ease-in-out infinite; }
@keyframes dt-pin-in { from { scale: .4; opacity: 0; } }
@keyframes dt-pin-pulse { 50% { box-shadow: 0 0 0 2px var(--rf-bg), 0 0 0 6px color-mix(in srgb, var(--rf-accent) 30%, transparent); } }
.dt-popover {
  position: fixed; z-index: ${REFLET_Z_INDEX.widgetRoot}; width: 320px; max-height: calc(100dvh - 24px); overflow: auto;
  padding: 6px; border-radius: 14px;
  animation: dt-popover-in 200ms var(--rf-ease);
}
.dt-popover.glass::before { animation: rf-fade 180ms var(--rf-ease); }
.dt-popover .dt-card { background: transparent; }
@keyframes dt-popover-in { from { transform: translateY(4px); } }
@keyframes dt-notice-in { from { transform: translateY(-6px); } }
.dt-notices {
  position: fixed; z-index: ${REFLET_Z_INDEX.annotatorOverlay}; left: 50%; top: 16px; translate: -50% 0;
  display: flex; flex-direction: column; gap: 6px; width: min(460px, calc(100vw - 24px));
}
.dt-notice {
  display: flex; align-items: center; gap: 6px; padding: 6px 6px 6px 14px; border-radius: 12px;
  color: var(--rf-danger); font-size: 12.5px; animation: dt-notice-in 220ms var(--rf-ease);
}
.dt-notice p { flex: 1; margin: 0; overflow-wrap: anywhere; }
.dt-notice .icon-btn { width: 30px; height: 30px; }
.dt-bar {
  --dt-edge-gap: calc(max(var(--rf-offset), 12px) + 48px);
  position: fixed; z-index: ${REFLET_Z_INDEX.devtoolsBar};
  display: flex; align-items: center; gap: 2px; padding: 3px;
  border-radius: var(--rf-pill);
  transition: left 260ms var(--rf-ease), right 260ms var(--rf-ease);
}
.dt-bar[data-side="left"] { left: calc(var(--rf-viewport-left, 0px) + max(12px, var(--rf-offset))); }
.dt-bar[data-side="right"] { right: calc(var(--rf-viewport-right, 0px) + max(12px, var(--rf-offset))); }
.dt-bar[data-edge="bottom"] { bottom: calc(var(--rf-viewport-bottom, 0px) + env(safe-area-inset-bottom) + var(--dt-edge-gap)); }
.dt-bar[data-edge="top"] { top: calc(var(--rf-viewport-top, 0px) + env(safe-area-inset-top) + var(--dt-edge-gap)); }
.dt-bar .icon-btn { position: relative; width: 34px; height: 34px; }
.dt-bar .icon-btn.dt-grip { width: 22px; color: var(--rf-text-muted); opacity: .6; }
.dt-bar .icon-btn.dt-grip:hover { opacity: 1; }
.dt-bar .icon-btn[aria-pressed="true"] { background: var(--rf-bg-hover); color: var(--rf-text); }
.dt-count {
  position: absolute; top: 1px; right: 1px; display: flex; align-items: center; justify-content: center;
  min-width: 15px; height: 15px; padding: 0 4px; border-radius: var(--rf-pill);
  background: var(--rf-accent); color: var(--rf-accent-text); font-size: 9.5px; font-weight: 600;
}
.dt-sheet {
  --dt-enter-x: 20px;
  position: fixed; z-index: ${REFLET_Z_INDEX.widgetRoot}; top: 12px; bottom: 12px;
  display: flex; flex-direction: column; max-width: calc(100vw - 24px); max-height: calc(100dvh - 24px);
  border-radius: 16px; overflow: hidden;
  animation: dt-sheet-slide 320ms var(--rf-ease);
}
.dt-sheet[data-side="left"] { --dt-enter-x: -20px; left: 12px; }
.dt-sheet[data-side="right"] { right: 12px; }
.dt-sheet.glass::before { animation: rf-fade 220ms var(--rf-ease); }
.dt-sheet-head, .dt-sheet-body { animation: rf-fade 260ms 60ms var(--rf-ease) both; }
@keyframes dt-sheet-slide { from { transform: translateX(var(--dt-enter-x)); box-shadow: none; } }
.dt-resize { position: absolute; z-index: 2; padding: 0; touch-action: none; }
.dt-resize:active:not(:disabled) { scale: 1; }
.dt-resize:focus-visible { outline: none; }
.dt-resize[data-axis="width"] { top: 16px; bottom: 16px; width: 10px; cursor: ew-resize; }
.dt-sheet[data-side="right"] .dt-resize[data-axis="width"] { left: 0; }
.dt-sheet[data-side="left"] .dt-resize[data-axis="width"] { right: 0; }
.dt-resize[data-axis="height"] { left: 16px; right: 16px; bottom: 0; height: 10px; cursor: ns-resize; }
.dt-resize[data-axis="both"] { bottom: 0; width: 16px; height: 16px; }
.dt-sheet[data-side="right"] .dt-resize[data-axis="both"] { left: 0; cursor: nesw-resize; }
.dt-sheet[data-side="left"] .dt-resize[data-axis="both"] { right: 0; cursor: nwse-resize; }
.dt-resize[data-axis="width"]::after, .dt-resize[data-axis="height"]::after {
  content: ""; position: absolute; border-radius: var(--rf-pill); background: var(--rf-text-muted);
  opacity: 0; transition: opacity 160ms var(--rf-ease);
}
.dt-resize[data-axis="width"]::after { top: 50%; left: 3px; width: 4px; height: 36px; translate: 0 -50%; }
.dt-resize[data-axis="height"]::after { left: 50%; top: 3px; width: 36px; height: 4px; translate: -50% 0; }
.dt-resize:hover::after, .dt-resize:focus-visible::after, .dt-resize:active::after { opacity: .5; }
.dt-sheet-head { position: relative; display: flex; align-items: center; gap: 4px; padding: 8px 8px 8px 6px; border-bottom: 1px solid var(--rf-border); }
.dt-sheet-head > :not(.dt-sheet-drag) { position: relative; z-index: 1; }
.dt-sheet-head .icon-btn { width: 32px; height: 32px; }
.dt-sheet .dt-sheet-drag { position: absolute; inset: 0; z-index: 0; padding: 0; border-radius: 0; cursor: grab; touch-action: none; }
.dt-sheet .dt-sheet-drag::before { content: ""; position: absolute; top: 4px; left: 50%; width: 36px; height: 4px; translate: -50% 0; border-radius: var(--rf-pill); background: var(--rf-text-muted); opacity: .3; transition: opacity 160ms var(--rf-ease); }
.dt-sheet .dt-sheet-drag:hover::before, .dt-sheet .dt-sheet-drag:active::before { opacity: .7; }
.dt-sheet .dt-sheet-drag:active:not(:disabled) { cursor: grabbing; scale: 1; }
.dt-sheet .dt-sheet-drag:focus-visible { outline-offset: -2px; }
.dt-tabs { display: flex; gap: 2px; margin-right: auto; }
.dt-tab { height: 30px; padding: 0 11px; border-radius: var(--rf-pill); color: var(--rf-text-muted); font-weight: 500; }
.dt-tab:hover { color: var(--rf-text); }
.dt-tab[aria-selected="true"] { background: var(--rf-bg-hover); color: var(--rf-text); }
.dt-sheet-body { flex: 1; min-height: 0; overflow: auto; display: flex; flex-direction: column; gap: 8px; padding: 10px; }
.dt-sheet-foot {
  position: sticky; bottom: -10px; display: flex; flex-wrap: wrap; align-items: center; gap: 6px;
  margin: auto -10px -10px; padding: 10px; border-top: 1px solid var(--rf-border); background: var(--rf-bg);
}
.dt-archived { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; padding: 8px 10px; border: 1px dashed var(--rf-border); border-radius: 12px; }
.dt-archived .dt-meta { flex: 1 1 100%; }
.dt-group { margin: 6px 2px 0; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; color: var(--rf-text-muted); }
.dt-card { display: flex; flex-direction: column; gap: 6px; padding: 10px 12px; border-radius: 12px; background: var(--rf-bg-subtle); }
.dt-card[data-sent="true"] { opacity: .7; }
.dt-card-head { display: flex; align-items: center; gap: 6px; min-width: 0; }
.dt-card-title { min-width: 0; margin: 0; overflow: hidden; font-size: 13px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.dt-meta { margin: 0; font-size: 11.5px; color: var(--rf-text-muted); overflow-wrap: anywhere; }
.dt-note-text { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; }
.dt-chip { flex: none; padding: 1px 7px; border-radius: var(--rf-pill); background: var(--rf-bg-hover); color: var(--rf-text-muted); font-size: 10.5px; font-weight: 600; }
.dt-chip[data-tone="accent"] { background: color-mix(in srgb, var(--rf-accent) 16%, transparent); color: var(--rf-accent); }
.dt-source { padding: 0; font: 11.5px/1.4 ${MONO_FONT}; color: var(--rf-accent); text-align: left; overflow-wrap: anywhere; }
.dt-source:hover { text-decoration: underline; }
.dt-thumb { display: block; align-self: flex-start; max-width: 100%; height: auto; max-height: 132px; object-fit: contain; border-radius: 8px; box-shadow: var(--rf-shadow-inset); }
.dt-actions { display: flex; flex-wrap: wrap; gap: 4px; }
.dt-btn {
  display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 10px;
  border-radius: var(--rf-pill); background: var(--rf-bg-hover); color: var(--rf-text);
  font-size: 12px; font-weight: 500; text-decoration: none;
}
.dt-btn:hover { background: color-mix(in srgb, var(--rf-text) 12%, transparent); }
.dt-btn[data-variant="primary"] { background: var(--rf-primary); color: var(--rf-primary-text); }
.dt-btn[data-variant="danger"] { color: var(--rf-danger); }
.dt-empty { margin: auto; padding: 24px 16px; color: var(--rf-text-muted); font-size: 12.5px; text-align: center; }
.dt-empty p { margin: 0 0 8px; }
.dt-empty code, .dt-hint code { padding: 1px 4px; border-radius: 4px; background: var(--rf-bg-hover); font: 11.5px ${MONO_FONT}; overflow-wrap: anywhere; }
.dt-hint { margin: 0; padding: 8px 10px; border-radius: 10px; background: var(--rf-bg-subtle); color: var(--rf-text-muted); font-size: 12px; }
.dt-error { margin: 0; color: var(--rf-danger); font-size: 12px; }
.dt-status { margin: 0 auto 0 0; color: var(--rf-text-muted); font-size: 12px; }
.dt-field {
  width: 100%; padding: 7px 9px; border: 1px solid var(--rf-border); border-radius: 8px;
  background: var(--rf-bg); color: var(--rf-text); font: inherit; resize: vertical;
}
.dt-field:focus { outline: 2px solid var(--rf-accent); outline-offset: 0; }
.dt-search { display: flex; gap: 6px; }
.dt-matches { display: flex; flex-direction: column; gap: 2px; margin: 0; padding: 0; list-style: none; }
.dt-match { display: flex; flex-direction: column; gap: 1px; width: 100%; padding: 6px 8px; border-radius: 8px; text-align: left; }
.dt-match:hover { background: var(--rf-bg-hover); }
.dt-match code { font: 11.5px ${MONO_FONT}; color: var(--rf-accent); }
.dt-match span { font: 11.5px ${MONO_FONT}; color: var(--rf-text-muted); white-space: pre; overflow: hidden; text-overflow: ellipsis; }
.dt-code-head { display: flex; flex-direction: column; gap: 6px; }
.dt-code-path { margin: 0; font: 12px/1.4 ${MONO_FONT}; overflow-wrap: anywhere; }
.dt-code { flex: 1; min-height: 0; overflow: auto; margin: 0; padding: 8px 0; border-radius: 10px; background: var(--rf-bg-subtle); font: 12px/1.6 ${MONO_FONT}; }
.dt-code-lines { display: table; min-width: 100%; }
.dt-line { display: table-row; white-space: pre; }
.dt-line > span { display: table-cell; padding-right: 14px; }
.dt-line > .dt-line-number { width: 1%; padding: 0 12px 0 10px; color: var(--rf-text-muted); text-align: right; user-select: none; }
.dt-line[data-marked="true"] { background: color-mix(in srgb, var(--rf-accent) 16%, transparent); }
.dt-line[data-marked="true"] > .dt-line-number { color: var(--rf-accent); }
`;
