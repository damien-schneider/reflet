/**
 * Styles for the feedback widget. Injected into a shadow root, so nothing here
 * leaks into the host app and nothing from the host app leaks in.
 */
export const WIDGET_STYLES = `
:host {
  --rf-bg: #ffffff;
  --rf-bg-subtle: rgb(55 53 47 / 4%);
  --rf-bg-hover: rgb(55 53 47 / 7%);
  --rf-border: rgb(55 53 47 / 9%);
  --rf-text: #37352f;
  --rf-text-muted: rgb(55 53 47 / 55%);
  --rf-primary: #37352f;
  --rf-primary-text: #ffffff;
  --rf-accent: #2383e2;
  --rf-danger: #d44c47;
  --rf-success: #448361;
  --rf-radius: 12px;
  --rf-radius-sm: 8px;
  --rf-shadow-inset: inset 0 0 0 1px var(--rf-border);
  --rf-shadow-low: 0 0 0 1px rgb(15 15 15 / 4%), 0 1px 2px rgb(15 15 15 / 6%), 0 4px 10px -4px rgb(15 15 15 / 10%);
  --rf-shadow: 0 0 0 1px rgb(15 15 15 / 4%), 0 2px 5px -1px rgb(15 15 15 / 7%), 0 12px 32px -8px rgb(15 15 15 / 16%);
  --rf-ring: 0 0 0 3px color-mix(in srgb, var(--rf-accent) 20%, transparent);
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
  --rf-text: #ebeae8;
  --rf-text-muted: rgb(255 255 255 / 46%);
  --rf-primary: #f1efec;
  --rf-primary-text: #1c1c1b;
  --rf-accent: #529cca;
  --rf-danger: #eb5757;
  --rf-success: #4dab74;
  --rf-shadow-low: 0 0 0 1px rgb(255 255 255 / 6%), 0 1px 2px rgb(0 0 0 / 30%), 0 4px 10px -4px rgb(0 0 0 / 40%);
  --rf-shadow: 0 0 0 1px rgb(255 255 255 / 7%), 0 2px 5px -1px rgb(0 0 0 / 35%), 0 14px 36px -10px rgb(0 0 0 / 55%);
  color-scheme: dark;
}

*, *::before, *::after { box-sizing: border-box; }

.root {
  position: fixed;
  z-index: 2147483000;
  display: flex;
  flex-direction: column;
  gap: 10px;
  font-family: inherit;
  font-size: 13.5px;
  line-height: 1.45;
  color: var(--rf-text);
}

.root[data-position$="right"] { right: var(--rf-offset); align-items: flex-end; }
.root[data-position$="left"] { left: var(--rf-offset); align-items: flex-start; }
.root[data-position^="bottom"] { bottom: var(--rf-offset); }
.root[data-position^="top"] { top: var(--rf-offset); flex-direction: column-reverse; }

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
  gap: 6px;
  height: 32px;
  padding: 0 11px;
  border-radius: var(--rf-radius-sm);
  background: var(--rf-primary);
  color: var(--rf-primary-text);
  font-size: 13px;
  font-weight: 500;
  letter-spacing: -0.005em;
  box-shadow: var(--rf-shadow-low);
  transition: transform 240ms var(--rf-ease), box-shadow 240ms var(--rf-ease), opacity 160ms var(--rf-ease);
}
.launcher:hover { transform: translateY(-1px); box-shadow: var(--rf-shadow); }
.launcher:active { transform: translateY(0) scale(0.98); }

.launcher-icon { position: relative; width: 15px; height: 15px; flex: none; }
.launcher-icon svg { position: absolute; inset: 0; width: 100%; height: 100%; transition: opacity 200ms var(--rf-ease), transform 320ms var(--rf-ease); }
.launcher-icon .on-close { opacity: 0; transform: rotate(-90deg) scale(0.6); }
.launcher[data-open="true"] .on-open { opacity: 0; transform: rotate(90deg) scale(0.6); }
.launcher[data-open="true"] .on-close { opacity: 1; transform: none; }

.panel {
  width: min(352px, calc(100vw - 24px));
  max-height: min(600px, calc(100vh - 96px));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--rf-bg);
  border-radius: var(--rf-radius);
  box-shadow: var(--rf-shadow);
  animation: rf-in 220ms var(--rf-ease);
}
.root[data-position^="bottom"] .panel { transform-origin: bottom center; }
.root[data-position^="top"] .panel { transform-origin: top center; animation-name: rf-in-top; }

@keyframes rf-in {
  from { opacity: 0; transform: translateY(6px) scale(0.985); }
}
@keyframes rf-in-top {
  from { opacity: 0; transform: translateY(-6px) scale(0.985); }
}
@keyframes rf-fade { from { opacity: 0; } }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
}

.head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 10px 4px 14px;
}
.head h2 { margin: 0; font-size: 13.5px; font-weight: 600; letter-spacing: -0.01em; }
.head .spacer { flex: 1; }

.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  flex: none;
  border-radius: 6px;
  color: var(--rf-text-muted);
  transition: background 120ms var(--rf-ease), color 120ms var(--rf-ease);
}
.icon-btn:hover { background: var(--rf-bg-hover); color: var(--rf-text); }

.body { display: flex; flex-direction: column; gap: 8px; padding: 6px 14px 14px; overflow-y: auto; }

.segmented {
  border: 0;
  margin: 0;
  min-inline-size: 0;
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
  gap: 2px;
  padding: 2px;
  background: var(--rf-bg-subtle);
  border-radius: var(--rf-radius-sm);
}
.segmented button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  height: 26px;
  border-radius: 6px;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--rf-text-muted);
  transition: background 160ms var(--rf-ease), color 160ms var(--rf-ease);
}
.segmented button:hover { color: var(--rf-text); }
.segmented button[aria-pressed="true"] {
  background: var(--rf-bg);
  color: var(--rf-text);
  box-shadow: var(--rf-shadow-low);
}

textarea, input[type="email"] {
  width: 100%;
  padding: 8px 10px;
  font: inherit;
  color: var(--rf-text);
  background: var(--rf-bg);
  border: 1px solid var(--rf-border);
  border-radius: var(--rf-radius-sm);
  transition: border-color 160ms var(--rf-ease), box-shadow 160ms var(--rf-ease);
}
textarea { min-height: 84px; max-height: 220px; resize: none; }
textarea::placeholder, input::placeholder { color: var(--rf-text-muted); }
textarea:focus, input:focus { outline: none; border-color: color-mix(in srgb, var(--rf-accent) 55%, transparent); box-shadow: var(--rf-ring); }

.attachments { display: flex; flex-wrap: wrap; gap: 6px; }

.card {
  flex: 1 0 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  padding: 6px;
  border-radius: 10px;
  background: var(--rf-bg-subtle);
  animation: rf-fade 200ms var(--rf-ease);
}
.thumb {
  position: relative;
  flex: 0 0 60px;
  height: 42px;
  overflow: hidden;
  border-radius: 6px;
  background: var(--rf-bg);
  box-shadow: var(--rf-shadow-inset);
}
.thumb img { width: 100%; height: 100%; object-fit: cover; object-position: top center; display: block; }
.thumb.contain img { object-fit: contain; object-position: center; }
.card .meta { display: flex; flex-direction: column; justify-content: center; gap: 1px; min-width: 0; }
.card .meta strong { font-size: 12.5px; font-weight: 550; }
.card .meta span { font-size: 11.5px; color: var(--rf-text-muted); }
.card .actions { display: flex; gap: 2px; margin-left: auto; align-items: center; }
.truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.card code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; }

.ghost-btn {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 10px;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--rf-text-muted);
  border-radius: var(--rf-radius-sm);
  box-shadow: var(--rf-shadow-inset);
  transition: background 160ms var(--rf-ease), color 160ms var(--rf-ease);
}
.ghost-btn:hover { background: var(--rf-bg-subtle); color: var(--rf-text); }

.submit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  height: 32px;
  margin-top: 2px;
  font-size: 13px;
  font-weight: 550;
  color: var(--rf-primary-text);
  background: var(--rf-primary);
  border-radius: var(--rf-radius-sm);
  transition: opacity 160ms var(--rf-ease), transform 160ms var(--rf-ease);
}
.submit:hover:not(:disabled) { opacity: 0.88; }
.submit:active:not(:disabled) { transform: scale(0.99); }
.submit:disabled { opacity: 0.35; cursor: not-allowed; }

.error { margin: 0; font-size: 12px; color: var(--rf-danger); }

.footer {
  min-height: 34px;
  padding: 0 14px;
  border-top: 1px solid var(--rf-border);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  font-size: 11px;
  color: var(--rf-text-muted);
}
.footer[data-dismissible="true"] { justify-content: space-between; }
.footer a { color: inherit; text-decoration: none; font-weight: 550; transition: color 120ms var(--rf-ease); }
.footer a:hover { color: var(--rf-text); }
.dismiss-btn {
  align-self: stretch;
  color: inherit;
  font-size: 11px;
  transition: color 120ms var(--rf-ease);
}
.dismiss-btn:hover { color: var(--rf-text); }

.done { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 30px 20px 34px; text-align: center; }
.done svg { color: var(--rf-success); }
.done h2 { margin: 0; font-size: 14px; font-weight: 600; }
.done p { margin: 0; font-size: 12.5px; color: var(--rf-text-muted); }

.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  opacity: 0.6;
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
  background: rgb(15 15 15 / 76%);
  backdrop-filter: blur(3px);
  animation: rf-fade 180ms var(--rf-ease);
}

.editor { flex: 1; display: flex; align-items: center; justify-content: center; padding: 24px 24px 0; min-height: 0; }
.editor canvas {
  max-width: 100%;
  max-height: 100%;
  border-radius: 10px;
  box-shadow: 0 20px 60px -16px rgb(0 0 0 / 70%);
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
  gap: 2px;
  padding: 4px;
  background: var(--rf-bg);
  border-radius: 10px;
  box-shadow: var(--rf-shadow);
}
.tool {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 7px;
  color: var(--rf-text-muted);
  transition: background 160ms var(--rf-ease), color 160ms var(--rf-ease);
}
.tool:hover { background: var(--rf-bg-hover); color: var(--rf-text); }
.tool[aria-pressed="true"] { background: var(--rf-bg-hover); color: var(--rf-text); }
.swatch {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid transparent;
  transition: transform 200ms var(--rf-ease), border-color 160ms var(--rf-ease);
}
.swatch[aria-pressed="true"] { border-color: var(--rf-text); transform: scale(1.15); }
.toolbar .done-btn {
  height: 30px;
  padding: 0 13px;
  font-size: 13px;
  font-weight: 550;
  border-radius: 7px;
  color: var(--rf-primary-text);
  background: var(--rf-primary);
  transition: opacity 160ms var(--rf-ease);
}
.toolbar .done-btn:hover { opacity: 0.88; }

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

@media (pointer: coarse) {
  .icon-btn, .tool, .swatch {
    width: 44px;
    height: 44px;
  }

  .launcher, .segmented button, .ghost-btn, .submit, .toolbar .done-btn {
    min-height: 44px;
  }

  .dismiss-btn, .footer a {
    display: inline-flex;
    min-height: 44px;
    align-items: center;
  }

  .footer a {
    min-width: 44px;
    justify-content: center;
  }
}
`;
