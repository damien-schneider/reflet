export const PICKER_STYLES = `
.picker-box {
  position: fixed;
  pointer-events: none;
  border-radius: 5px;
  background: color-mix(in srgb, var(--rf-accent) 10%, transparent);
  box-shadow: 0 0 0 2px var(--rf-accent), 0 0 0 5px color-mix(in srgb, var(--rf-accent) 18%, transparent);
  transition: top 130ms var(--rf-ease), left 130ms var(--rf-ease), width 130ms var(--rf-ease), height 130ms var(--rf-ease);
}
.picker-label {
  position: fixed;
  pointer-events: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: min(420px, 90vw);
  height: 24px;
  padding: 0 8px;
  font-size: 11.5px;
  font-weight: 500;
  color: #ffffff;
  background: var(--rf-accent);
  border-radius: 6px;
  box-shadow: 0 4px 12px -3px rgb(15 15 15 / 35%);
  white-space: nowrap;
  overflow: hidden;
  transition: top 130ms var(--rf-ease), left 130ms var(--rf-ease);
}
.picker-label strong { flex: none; font-weight: 600; }
.picker-label span { min-width: 0; overflow: hidden; text-overflow: ellipsis; opacity: 0.75; }
.picker-hint {
  position: fixed;
  left: 50%;
  bottom: 24px;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  font-size: 12.5px;
  color: var(--rf-text);
  background: var(--rf-bg);
  border-radius: 10px;
  box-shadow: var(--rf-shadow);
  animation: rf-fade 240ms var(--rf-ease);
}
.picker-hint kbd {
  padding: 1px 5px;
  font: inherit;
  font-size: 11px;
  color: var(--rf-text-muted);
  border-radius: 4px;
  background: var(--rf-bg-subtle);
  box-shadow: var(--rf-shadow-inset);
}

`;
