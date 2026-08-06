/**
 * Styles for the feedback widget. Injected into a shadow root, so nothing here
 * leaks into the host app and nothing from the host app leaks in.
 */
export const WIDGET_STYLES = `
:host {
  --rf-bg: #ffffff;
  --rf-bg-subtle: #f6f7f9;
  --rf-border: #e4e6eb;
  --rf-text: #16181d;
  --rf-text-muted: #6b7280;
  --rf-primary: #4f46e5;
  --rf-primary-text: #ffffff;
  --rf-danger: #dc2626;
  --rf-success: #16a34a;
  --rf-radius: 14px;
  --rf-shadow: 0 1px 2px rgb(16 24 40 / 6%), 0 12px 32px -8px rgb(16 24 40 / 18%);
  --rf-ring: 0 0 0 3px color-mix(in srgb, var(--rf-primary) 28%, transparent);
  --rf-ease: cubic-bezier(0.32, 0.72, 0, 1);
  color-scheme: light;
  all: initial;
  font-family: var(--rf-font, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif);
}

:host([data-theme="dark"]) {
  --rf-bg: #17181c;
  --rf-bg-subtle: #212228;
  --rf-border: #2e3038;
  --rf-text: #f3f4f6;
  --rf-text-muted: #9aa1ad;
  --rf-shadow: 0 1px 2px rgb(0 0 0 / 40%), 0 16px 40px -12px rgb(0 0 0 / 60%);
  color-scheme: dark;
}

*, *::before, *::after { box-sizing: border-box; }

.root {
  position: fixed;
  z-index: 2147483000;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.45;
  color: var(--rf-text);
}

.root[data-position="bottom-right"] { bottom: var(--rf-offset); right: var(--rf-offset); align-items: flex-end; }
.root[data-position="bottom-left"] { bottom: var(--rf-offset); left: var(--rf-offset); align-items: flex-start; }
.root[data-position="top-right"] { top: var(--rf-offset); right: var(--rf-offset); align-items: flex-end; }
.root[data-position="top-left"] { top: var(--rf-offset); left: var(--rf-offset); align-items: flex-start; }

.stack { display: flex; flex-direction: column; gap: 12px; }
.root[data-position^="top"] .stack { flex-direction: column-reverse; }

button {
  font: inherit;
  color: inherit;
  margin: 0;
  cursor: pointer;
  border: 0;
  background: none;
}

:focus-visible { outline: none; box-shadow: var(--rf-ring); }

.launcher {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 44px;
  padding: 0 16px;
  border-radius: 999px;
  background: var(--rf-primary);
  color: var(--rf-primary-text);
  font-weight: 550;
  box-shadow: var(--rf-shadow);
  transition: transform 160ms var(--rf-ease), filter 160ms var(--rf-ease);
}
.launcher:hover { transform: translateY(-1px); filter: brightness(1.06); }
.launcher:active { transform: translateY(0) scale(0.97); }
.launcher[data-compact="true"] { width: 44px; padding: 0; justify-content: center; }

.panel {
  width: min(384px, calc(100vw - 32px));
  max-height: min(620px, calc(100vh - 96px));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--rf-bg);
  border: 1px solid var(--rf-border);
  border-radius: var(--rf-radius);
  box-shadow: var(--rf-shadow);
  animation: rf-in 220ms var(--rf-ease);
}

@keyframes rf-in {
  from { opacity: 0; transform: translateY(8px) scale(0.98); }
  to { opacity: 1; transform: none; }
}

@media (prefers-reduced-motion: reduce) {
  .panel, .launcher { animation: none; transition: none; }
}

.head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 14px 10px;
}
.head h2 { margin: 0; font-size: 15px; font-weight: 600; }
.head .spacer { flex: 1; }

.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  color: var(--rf-text-muted);
  transition: background 120ms var(--rf-ease), color 120ms var(--rf-ease);
}
.icon-btn:hover { background: var(--rf-bg-subtle); color: var(--rf-text); }

.body { display: flex; flex-direction: column; gap: 12px; padding: 0 14px 14px; overflow-y: auto; }

.segmented {
  border: 0;
  margin: 0;
  min-inline-size: 0;
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
  gap: 4px;
  padding: 4px;
  background: var(--rf-bg-subtle);
  border-radius: 10px;
}
.segmented button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 32px;
  border-radius: 7px;
  font-size: 13px;
  font-weight: 500;
  color: var(--rf-text-muted);
  transition: background 140ms var(--rf-ease), color 140ms var(--rf-ease);
}
.segmented button[aria-pressed="true"] {
  background: var(--rf-bg);
  color: var(--rf-text);
  box-shadow: 0 1px 2px rgb(16 24 40 / 8%);
}

textarea, input[type="email"] {
  width: 100%;
  padding: 10px 12px;
  font: inherit;
  color: var(--rf-text);
  background: var(--rf-bg);
  border: 1px solid var(--rf-border);
  border-radius: 10px;
  transition: border-color 140ms var(--rf-ease), box-shadow 140ms var(--rf-ease);
}
textarea { min-height: 92px; max-height: 220px; resize: none; }
textarea::placeholder, input::placeholder { color: var(--rf-text-muted); }
textarea:focus, input:focus { outline: none; border-color: var(--rf-primary); box-shadow: var(--rf-ring); }

.attachment {
  display: flex;
  gap: 10px;
  padding: 8px;
  border: 1px solid var(--rf-border);
  border-radius: 10px;
  background: var(--rf-bg-subtle);
}
.thumb {
  position: relative;
  flex: 0 0 84px;
  height: 56px;
  overflow: hidden;
  border-radius: 6px;
  border: 1px solid var(--rf-border);
  background: var(--rf-bg);
}
.thumb img { width: 100%; height: 100%; object-fit: cover; object-position: top center; display: block; }
.attachment .meta { display: flex; flex-direction: column; justify-content: center; gap: 4px; min-width: 0; }
.attachment .meta strong { font-size: 12.5px; font-weight: 550; }
.attachment .meta span { font-size: 12px; color: var(--rf-text-muted); }
.attachment .actions { display: flex; gap: 4px; margin-left: auto; align-items: center; }

.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
  padding: 5px 8px;
  font-size: 12px;
  border: 1px solid var(--rf-border);
  border-radius: 8px;
  background: var(--rf-bg-subtle);
  color: var(--rf-text-muted);
}
.chip code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11.5px; color: var(--rf-text); }
.chip .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.row { display: flex; gap: 8px; align-items: center; }
.ghost-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 10px;
  font-size: 13px;
  font-weight: 500;
  color: var(--rf-text-muted);
  border: 1px solid var(--rf-border);
  border-radius: 9px;
  transition: background 140ms var(--rf-ease), color 140ms var(--rf-ease);
}
.ghost-btn:hover { background: var(--rf-bg-subtle); color: var(--rf-text); }

.submit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  height: 38px;
  font-weight: 550;
  color: var(--rf-primary-text);
  background: var(--rf-primary);
  border-radius: 10px;
  transition: filter 140ms var(--rf-ease);
}
.submit:hover:not(:disabled) { filter: brightness(1.06); }
.submit:disabled { opacity: 0.55; cursor: not-allowed; }

.error { margin: 0; font-size: 12.5px; color: var(--rf-danger); }
.hint { margin: 0; font-size: 12px; color: var(--rf-text-muted); }

.footer {
  min-height: 44px;
  padding: 0 14px;
  border-top: 1px solid var(--rf-border);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  font-size: 11.5px;
  color: var(--rf-text-muted);
}
.footer[data-dismissible="true"] { justify-content: space-between; }
.footer a { color: inherit; text-decoration: none; font-weight: 550; }
.footer a:hover { color: var(--rf-text); }
.dismiss-btn {
  align-self: stretch;
  color: inherit;
  font-size: 11.5px;
  text-decoration: underline;
  text-underline-offset: 3px;
}
.dismiss-btn:hover { color: var(--rf-text); }

.done { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 32px 20px 36px; text-align: center; }
.done svg { color: var(--rf-success); }
.done h2 { margin: 0; font-size: 15px; }
.done p { margin: 0; font-size: 13px; color: var(--rf-text-muted); }

.spinner {
  width: 15px;
  height: 15px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: rf-spin 700ms linear infinite;
}
@keyframes rf-spin { to { transform: rotate(360deg); } }

.hp { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }

.overlay {
  position: fixed;
  inset: 0;
  z-index: 2147483001;
  display: flex;
  flex-direction: column;
  background: rgb(9 10 13 / 78%);
  backdrop-filter: blur(2px);
}

.editor { flex: 1; display: flex; align-items: center; justify-content: center; padding: 24px 24px 0; min-height: 0; }
.editor canvas {
  max-width: 100%;
  max-height: 100%;
  border-radius: 8px;
  box-shadow: 0 24px 60px -12px rgb(0 0 0 / 60%);
  cursor: crosshair;
  touch-action: none;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  flex-wrap: wrap;
  padding: 14px 16px calc(14px + env(safe-area-inset-bottom));
}
.toolbar .group {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px;
  background: var(--rf-bg);
  border: 1px solid var(--rf-border);
  border-radius: 12px;
  box-shadow: var(--rf-shadow);
}
.tool {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  color: var(--rf-text-muted);
  transition: background 140ms var(--rf-ease), color 140ms var(--rf-ease);
}
.tool:hover { background: var(--rf-bg-subtle); color: var(--rf-text); }
.tool[aria-pressed="true"] { background: var(--rf-primary); color: var(--rf-primary-text); }
.swatch {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid transparent;
  transition: transform 140ms var(--rf-ease);
}
.swatch[aria-pressed="true"] { border-color: var(--rf-text); transform: scale(1.12); }
.toolbar .done-btn {
  height: 34px;
  padding: 0 14px;
  font-weight: 550;
  border-radius: 8px;
  color: var(--rf-primary-text);
  background: var(--rf-primary);
}

.picker { position: fixed; inset: 0; z-index: 2147483002; cursor: crosshair; }
.picker-box {
  position: fixed;
  pointer-events: none;
  border: 2px solid var(--rf-primary);
  border-radius: 3px;
  background: color-mix(in srgb, var(--rf-primary) 12%, transparent);
  transition: all 90ms var(--rf-ease);
}
.picker-label {
  position: fixed;
  pointer-events: none;
  display: flex;
  align-items: center;
  gap: 6px;
  max-width: min(420px, 90vw);
  padding: 5px 9px;
  font-size: 12px;
  font-weight: 500;
  color: var(--rf-primary-text);
  background: var(--rf-primary);
  border-radius: 7px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.picker-label code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; opacity: 0.82; }
.picker-hint {
  position: fixed;
  left: 50%;
  bottom: 24px;
  transform: translateX(-50%);
  padding: 9px 14px;
  font-size: 13px;
  color: var(--rf-text);
  background: var(--rf-bg);
  border: 1px solid var(--rf-border);
  border-radius: 10px;
  box-shadow: var(--rf-shadow);
}
.picker-hint kbd {
  padding: 1px 5px;
  font: inherit;
  font-size: 11.5px;
  border: 1px solid var(--rf-border);
  border-radius: 4px;
  background: var(--rf-bg-subtle);
}
`;
