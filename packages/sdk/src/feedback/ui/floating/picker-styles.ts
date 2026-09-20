import { REFLET_Z_INDEX } from "../../../z-index";

export const PICKER_STYLES = `
.picker-box {
  position: fixed;
  top: 0;
  left: 0;
  pointer-events: none;
  border-radius: 5px;
  background: color-mix(in srgb, var(--rf-accent) 10%, transparent);
  box-shadow: 0 0 0 2px var(--rf-accent), 0 0 0 5px color-mix(in srgb, var(--rf-accent) 18%, transparent);
  will-change: translate;
  transition: translate 130ms var(--rf-ease);
}
.picker-box[data-pinned="true"] { transition: none; }
.picker-label {
  position: fixed;
  top: 0;
  left: 0;
  pointer-events: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: min(420px, 90vw);
  height: 24px;
  padding: 0 8px;
  font-size: 11.5px;
  font-weight: 500;
  color: var(--rf-accent-text);
  background: var(--rf-accent);
  border-radius: 6px;
  box-shadow: var(--rf-shadow-float);
  white-space: nowrap;
  overflow: hidden;
  will-change: translate;
  transition: translate 130ms var(--rf-ease);
}
.picker-label strong { flex: none; font-weight: 600; }
.picker-label span { min-width: 0; overflow: hidden; text-overflow: ellipsis; opacity: 0.75; }
.selection-outline {
  position: fixed;
  top: 0;
  left: 0;
  pointer-events: none;
  border-radius: 5px;
  background: color-mix(in srgb, var(--rf-accent) 7%, transparent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--rf-accent) 70%, transparent), 0 0 0 5px color-mix(in srgb, var(--rf-accent) 14%, transparent);
  transition: opacity 160ms var(--rf-ease);
}
.picker-hint {
  position: fixed;
  left: 50%;
  bottom: calc(24px + env(safe-area-inset-bottom));
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 6px;
  max-width: calc(100vw - 24px);
  padding: 5px 6px 5px 12px;
  font-size: 12.5px;
  color: var(--rf-text);
  background: var(--rf-bg);
  border-radius: var(--rf-pill);
  box-shadow: var(--rf-ring), var(--rf-shadow);
  animation: rf-fade 240ms var(--rf-ease);
}
.picker-instruction { display: flex; align-items: center; gap: 6px; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.picker-hint kbd {
  padding: 1px 5px;
  font: inherit;
  font-size: 11px;
  color: var(--rf-text-muted);
  border-radius: 4px;
  background: var(--rf-bg-subtle);
  box-shadow: var(--rf-shadow-inset);
}
.picker-cancel {
  display: inline-flex;
  align-items: center;
  height: 40px;
  padding: 0 14px;
  border-radius: var(--rf-pill);
  font-size: 12.5px;
  font-weight: 500;
  white-space: nowrap;
  color: var(--rf-text-muted);
}
.picker-cancel:hover { background: var(--rf-bg-hover); color: var(--rf-text); }
.picker-note {
  position: fixed;
  z-index: ${REFLET_Z_INDEX.annotatorOverlay};
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 300px;
  max-width: calc(100vw - 24px);
  padding: 6px 6px 6px 8px;
  border-radius: 18px;
  animation: rf-in 180ms var(--rf-ease);
}
.picker-note:focus-within { outline: 2px solid var(--rf-accent); outline-offset: 2px; }
.picker-note-target {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  padding: 2px 4px 0;
  font-size: 11px;
  color: var(--rf-text-muted);
  white-space: nowrap;
}
.picker-note-target strong { flex: none; font-weight: 600; color: var(--rf-accent); }
.picker-note-target span { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.picker-note textarea {
  width: 100%;
  min-height: 46px;
  max-height: min(160px, 30dvh);
  margin: 0;
  padding: 7px 6px 0;
  border: 0;
  resize: none;
  background: transparent;
  color: var(--rf-text);
  font-size: 13px;
  line-height: 19px;
}
.picker-note textarea:focus { outline: none; }
.picker-note textarea::placeholder { color: var(--rf-text-muted); }
.picker-note-actions { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
@media (pointer: coarse) {
  .picker-hint { padding: 6px 8px 6px 14px; }
  .picker-hint kbd { display: none; }
  .picker-cancel { height: 44px; padding: 0 18px; font-size: 14px; }
  .picker-note textarea { font-size: 16px; min-height: 56px; }
}

`;
