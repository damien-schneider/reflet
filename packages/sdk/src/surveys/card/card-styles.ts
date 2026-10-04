const LIGHT_TOKENS = `
  --rfs-bg: #ffffff;
  --rfs-text: #18181b;
  --rfs-muted: #71717a;
  --rfs-border: rgb(24 24 27 / 10%);
  --rfs-subtle: rgb(24 24 27 / 4%);
  --rfs-hover: rgb(24 24 27 / 7%);
  --rfs-danger: #dc2626;
  --rfs-success: #16a34a;
  --rfs-primary: var(--rf-survey-primary, #18181b);
  --rfs-primary-text: var(--rf-survey-primary-text, #ffffff);
  --rfs-shadow: 0 0 0 1px var(--rfs-border), 0 2px 6px -1px rgb(15 15 15 / 8%), 0 18px 44px -14px rgb(15 15 15 / 24%);
  color-scheme: light;
`;

const DARK_TOKENS = `
  --rfs-bg: #1c1c1f;
  --rfs-text: #f4f4f5;
  --rfs-muted: #a1a1aa;
  --rfs-border: rgb(255 255 255 / 10%);
  --rfs-subtle: rgb(255 255 255 / 5%);
  --rfs-hover: rgb(255 255 255 / 9%);
  --rfs-danger: #f87171;
  --rfs-success: #4ade80;
  --rfs-primary: var(--rf-survey-primary, #fafafa);
  --rfs-primary-text: var(--rf-survey-primary-text, #18181b);
  --rfs-shadow: 0 0 0 1px var(--rfs-border), 0 2px 6px -1px rgb(0 0 0 / 30%), 0 18px 44px -14px rgb(0 0 0 / 60%);
  color-scheme: dark;
`;

/** Every selector hangs off `.rf-survey`, so the card looks the same in a shadow root and in a page. */
export const SURVEY_CARD_STYLES = `
.rf-survey {
  ${LIGHT_TOKENS}
  --rfs-radius: 14px;
  --rfs-control-radius: 9px;
  --rfs-ease: cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
  box-sizing: border-box;
  width: 100%;
  padding: 20px;
  border-radius: var(--rfs-radius);
  background: var(--rfs-bg);
  color: var(--rfs-text);
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  font-size: 14px;
  line-height: 1.45;
  text-align: left;
  -webkit-font-smoothing: antialiased;
  overflow: hidden;
}
.rf-survey[data-theme="dark"] { ${DARK_TOKENS} }
@media (prefers-color-scheme: dark) {
  .rf-survey[data-theme="auto"] { ${DARK_TOKENS} }
}
.rf-survey *, .rf-survey *::before, .rf-survey *::after { box-sizing: border-box; }
.rf-survey :where(h2, p) { margin: 0; }
.rf-survey :where(fieldset) { min-width: 0; margin: 0; padding: 0; border: 0; }
.rf-survey :where(button, input, textarea, a) {
  margin: 0;
  font: inherit;
  color: inherit;
  letter-spacing: inherit;
}
.rf-survey :where(button) { cursor: pointer; background: none; border: 0; padding: 0; }
.rf-survey :where(button:disabled) { cursor: default; }
.rf-survey :where(button, a, input, textarea):focus-visible {
  outline: 2px solid var(--rfs-primary);
  outline-offset: 2px;
}
.rf-survey[data-variant="floating"] { box-shadow: var(--rfs-shadow); animation: rfs-enter 360ms var(--rfs-ease); }
.rf-survey[data-variant="inline"] { box-shadow: 0 0 0 1px var(--rfs-border); }
.rf-survey[data-variant="page"] {
  max-width: 560px;
  margin: 0 auto;
  padding: 32px;
  box-shadow: var(--rfs-shadow);
  font-size: 15px;
}
.rfs-progress { position: absolute; inset: 0 0 auto; height: 3px; background: var(--rfs-subtle); }
.rfs-progress-fill {
  height: 100%;
  background: var(--rfs-primary);
  transform-origin: left;
  transition: transform 400ms var(--rfs-ease);
}
.rfs-close {
  position: absolute;
  top: 12px;
  right: 12px;
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  color: var(--rfs-muted);
  transition: background-color 150ms ease, color 150ms ease;
}
.rfs-close:hover { background: var(--rfs-hover); color: var(--rfs-text); }
.rfs-step { display: flex; flex-direction: column; gap: 14px; animation: rfs-step-in 280ms var(--rfs-ease); }
.rfs-heading { display: flex; flex-direction: column; gap: 4px; padding-right: 28px; }
.rfs-title { font-size: 1.07em; font-weight: 600; line-height: 1.35; text-wrap: balance; outline: none; }
.rfs-description { color: var(--rfs-muted); text-wrap: pretty; white-space: pre-line; }
.rfs-scale { display: flex; gap: 6px; }
.rfs-scale[data-kind="nps"] { display: grid; grid-template-columns: repeat(11, minmax(0, 1fr)); gap: 4px; }
.rfs-scale-option {
  flex: 1;
  min-width: 0;
  height: 40px;
  border-radius: var(--rfs-control-radius);
  background: var(--rfs-subtle);
  box-shadow: inset 0 0 0 1px var(--rfs-border);
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  transition: background-color 150ms ease, color 150ms ease, transform 150ms var(--rfs-ease);
}
.rfs-scale[data-kind="nps"] .rfs-scale-option { height: 36px; font-size: 13px; }
.rfs-scale-option:hover { background: var(--rfs-hover); }
.rfs-scale-option:active { transform: scale(0.96); }
.rfs-scale-option[aria-pressed="true"] { background: var(--rfs-primary); color: var(--rfs-primary-text); box-shadow: none; }
.rfs-scale[data-style="star"], .rfs-scale[data-style="emoji"] { gap: 2px; justify-content: center; }
.rfs-scale[data-style="star"] .rfs-scale-option,
.rfs-scale[data-style="emoji"] .rfs-scale-option {
  flex: 0 1 44px;
  height: 44px;
  background: none;
  box-shadow: none;
  color: var(--rfs-border);
}
.rfs-scale[data-style="star"] .rfs-scale-option[data-lit="true"] { color: #f5a524; }
.rfs-scale[data-style="emoji"] .rfs-scale-option { font-size: 26px; filter: grayscale(1); opacity: 0.55; }
.rfs-scale[data-style="emoji"] .rfs-scale-option:hover,
.rfs-scale[data-style="emoji"] .rfs-scale-option[aria-pressed="true"] { filter: none; opacity: 1; transform: scale(1.12); background: none; }
.rfs-scale-labels { display: flex; justify-content: space-between; gap: 12px; margin-top: -6px; color: var(--rfs-muted); font-size: 12px; }
.rfs-choices { display: flex; flex-direction: column; gap: 6px; }
.rfs-choice {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 40px;
  padding: 8px 12px;
  border-radius: var(--rfs-control-radius);
  background: var(--rfs-subtle);
  box-shadow: inset 0 0 0 1px var(--rfs-border);
  text-align: left;
  transition: background-color 150ms ease, box-shadow 150ms ease;
}
.rfs-choice:hover { background: var(--rfs-hover); }
.rfs-choice[aria-pressed="true"] { box-shadow: inset 0 0 0 1.5px var(--rfs-primary); background: var(--rfs-bg); }
.rfs-indicator {
  flex: none;
  display: grid;
  place-items: center;
  width: 16px;
  height: 16px;
  border-radius: 999px;
  box-shadow: inset 0 0 0 1.5px var(--rfs-muted);
  color: var(--rfs-primary-text);
  transition: background-color 150ms ease, box-shadow 150ms ease;
}
.rfs-indicator[data-shape="square"] { border-radius: 5px; }
.rfs-choice[aria-pressed="true"] .rfs-indicator { background: var(--rfs-primary); box-shadow: none; }
.rfs-boolean { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.rfs-boolean .rfs-choice { justify-content: center; font-weight: 500; }
.rfs-input {
  display: block;
  width: 100%;
  padding: 10px 12px;
  border: 0;
  border-radius: var(--rfs-control-radius);
  background: var(--rfs-subtle);
  box-shadow: inset 0 0 0 1px var(--rfs-border);
  resize: vertical;
  transition: box-shadow 150ms ease;
}
.rfs-input::placeholder { color: var(--rfs-muted); }
.rfs-input:focus { outline: none; box-shadow: inset 0 0 0 1.5px var(--rfs-primary); }
.rfs-input-wrap { display: flex; flex-direction: column; gap: 4px; }
.rfs-counter { align-self: flex-end; color: var(--rfs-muted); font-size: 12px; font-variant-numeric: tabular-nums; }
.rfs-counter[data-full="true"] { color: var(--rfs-danger); }
.rfs-error { color: var(--rfs-danger); font-size: 13px; }
.rfs-footer { display: flex; align-items: center; justify-content: flex-end; gap: 8px; margin-top: 2px; }
.rfs-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 36px;
  padding: 0 16px;
  border-radius: var(--rfs-control-radius);
  font-weight: 500;
  text-decoration: none;
  transition: background-color 150ms ease, opacity 150ms ease, transform 150ms var(--rfs-ease);
}
.rfs-button:active:not(:disabled) { transform: scale(0.97); }
.rfs-button[data-tone="primary"] { background: var(--rfs-primary); color: var(--rfs-primary-text); }
.rfs-button[data-tone="primary"]:hover:not(:disabled) { opacity: 0.88; }
.rfs-button[data-tone="primary"]:disabled { opacity: 0.55; }
.rfs-button[data-tone="ghost"] { margin-right: auto; color: var(--rfs-muted); }
.rfs-button[data-tone="ghost"]:hover { background: var(--rfs-hover); color: var(--rfs-text); }
.rfs-ending { align-items: center; padding: 8px 0 4px; text-align: center; }
.rfs-ending .rfs-heading { padding-right: 0; align-items: center; }
.rfs-ending-mark {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 999px;
  background: var(--rfs-subtle);
  color: var(--rfs-success);
  animation: rfs-pop 420ms var(--rfs-ease);
}
.rfs-skeleton { display: flex; flex-direction: column; gap: 10px; }
.rfs-skeleton-line { height: 12px; border-radius: 6px; background: var(--rfs-subtle); animation: rfs-pulse 1.4s ease-in-out infinite; }
.rfs-skeleton-line:first-child { width: 70%; height: 16px; }
@keyframes rfs-enter { from { opacity: 0; transform: translateY(12px) scale(0.98); } }
@keyframes rfs-step-in { from { opacity: 0; transform: translateX(8px); } }
@keyframes rfs-pop { from { opacity: 0; transform: scale(0.6); } }
@keyframes rfs-pulse { 50% { opacity: 0.5; } }
@media (prefers-reduced-motion: reduce) {
  .rf-survey, .rf-survey * { animation: none !important; transition: none !important; }
}
`;
