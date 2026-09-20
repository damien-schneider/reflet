import { getFeedbackChromeCSS } from "./react-feedback-styles-parts";
import { REFLET_Z_INDEX } from "./z-index";

const STYLE_ID = "reflet-feedback-styles";

export function injectFeedbackStyles(): void {
  if (typeof document === "undefined") {
    return;
  }
  if (document.getElementById(STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = getFeedbackCSS();
  document.head.appendChild(style);
}

function getFeedbackCSS(): string {
  return `
:root {
  --reflet-scrim: rgb(0 0 0 / 45%);
}

[data-reflet-feedback] {
  --reflet-primary: #6366f1;
  --reflet-primary-hover: #4f46e5;
  --reflet-on-primary: #ffffff;
  --reflet-on-primary-soft: rgb(255 255 255 / 30%);
  --reflet-bg: #ffffff;
  --reflet-bg-secondary: #f9fafb;
  --reflet-text: #111827;
  --reflet-text-secondary: #6b7280;
  --reflet-text-tertiary: #9ca3af;
  --reflet-border: #e5e7eb;
  --reflet-radius: 12px;
  --reflet-radius-sm: 8px;
  --reflet-shadow: 0 20px 60px -12px rgb(0 0 0 / 25%), 0 0 0 1px rgb(0 0 0 / 5%);
  --reflet-font: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --reflet-success: #22c55e;
  --reflet-error: #ef4444;
  --reflet-ease: cubic-bezier(0.16, 1, 0.3, 1);
}

@media (prefers-color-scheme: dark) {
  [data-reflet-feedback][data-theme="auto"] {
    --reflet-bg: #1f2937;
    --reflet-bg-secondary: #111827;
    --reflet-text: #f9fafb;
    --reflet-text-secondary: #9ca3af;
    --reflet-text-tertiary: #6b7280;
    --reflet-border: #374151;
    --reflet-shadow: 0 20px 60px -12px rgb(0 0 0 / 50%), 0 0 0 1px rgb(255 255 255 / 5%);
  }
}

[data-reflet-feedback][data-theme="dark"] {
  --reflet-bg: #1f2937;
  --reflet-bg-secondary: #111827;
  --reflet-text: #f9fafb;
  --reflet-text-secondary: #9ca3af;
  --reflet-text-tertiary: #6b7280;
  --reflet-border: #374151;
  --reflet-shadow: 0 20px 60px -12px rgb(0 0 0 / 50%), 0 0 0 1px rgb(255 255 255 / 5%);
}

@keyframes reflet-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes reflet-fade-out {
  from { opacity: 1; }
  to { opacity: 0; }
}

@keyframes reflet-slide-up {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

@keyframes reflet-slide-down {
  from { transform: translateY(0); }
  to { transform: translateY(100%); }
}

@keyframes reflet-scale-in {
  from { opacity: 0; transform: translate(-50%, -50%) scale(0.95); }
  to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
}

@keyframes reflet-scale-out {
  from { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  to { opacity: 0; transform: translate(-50%, -50%) scale(0.95); }
}

@keyframes reflet-checkmark {
  0% { stroke-dashoffset: 24; }
  100% { stroke-dashoffset: 0; }
}

@keyframes reflet-spin {
  to { transform: rotate(360deg); }
}

.reflet-dialog {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: ${REFLET_Z_INDEX.dialogContent};
  margin: 0;
  border: 0;
  padding: 0;
  background: var(--reflet-bg);
  border-radius: var(--reflet-radius);
  box-shadow: var(--reflet-shadow);
  width: 480px;
  max-width: calc(100vw - 32px);
  max-height: calc(100dvh - 64px);
  overflow: hidden;
  overscroll-behavior: contain;
  font-family: var(--reflet-font);
  color: var(--reflet-text);
  animation: reflet-scale-in 200ms var(--reflet-ease);
}

.reflet-dialog::backdrop {
  z-index: ${REFLET_Z_INDEX.dialogOverlay};
  background: var(--reflet-scrim);
  animation: reflet-fade-in 150ms ease-out;
}

.reflet-dialog[data-closing="true"] {
  animation: reflet-scale-out 150ms ease-out forwards;
}

.reflet-dialog[data-closing="true"]::backdrop {
  animation: reflet-fade-out 150ms ease-out forwards;
}

@media (max-width: 640px) {
  .reflet-dialog {
    top: auto;
    left: 0;
    right: 0;
    bottom: 0;
    transform: none;
    width: 100%;
    max-width: 100%;
    border-radius: var(--reflet-radius) var(--reflet-radius) 0 0;
    max-height: 90dvh;
    padding-bottom: env(safe-area-inset-bottom);
    animation: reflet-slide-up 300ms var(--reflet-ease);
  }

  .reflet-dialog[data-closing="true"] {
    animation: reflet-slide-down 200ms ease-out forwards;
  }
}

.reflet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 0;
}

.reflet-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  color: var(--reflet-text);
  line-height: 1.3;
}

.reflet-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  background: transparent;
  border-radius: 8px;
  color: var(--reflet-text-secondary);
  cursor: pointer;
  padding: 0;
  flex-shrink: 0;
  transition: background 150ms, color 150ms, transform 150ms var(--reflet-ease);
}

.reflet-close:hover {
  background: var(--reflet-bg-secondary);
  color: var(--reflet-text);
}

.reflet-close svg {
  width: 18px;
  height: 18px;
}

.reflet-form {
  padding: 20px 24px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.reflet-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.reflet-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--reflet-text-secondary);
}

.reflet-input,
.reflet-textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--reflet-border);
  border-radius: var(--reflet-radius-sm);
  background: var(--reflet-bg);
  color: var(--reflet-text);
  font-family: var(--reflet-font);
  font-size: 14px;
  line-height: 1.5;
  outline: none;
  transition: border-color 150ms, box-shadow 150ms;
  box-sizing: border-box;
}

.reflet-input::placeholder,
.reflet-textarea::placeholder {
  color: var(--reflet-text-tertiary);
}

.reflet-input:focus,
.reflet-textarea:focus {
  border-color: var(--reflet-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--reflet-primary) 15%, transparent);
}

.reflet-textarea {
  resize: vertical;
  min-height: 100px;
}

[data-reflet-feedback] :focus-visible {
  outline: 2px solid var(--reflet-primary);
  outline-offset: 2px;
}

[data-reflet-feedback] button:active:not(:disabled) {
  transform: scale(0.97);
}

@media (pointer: coarse), (max-width: 640px) {
  .reflet-input,
  .reflet-textarea {
    font-size: 16px;
  }
}
${getFeedbackChromeCSS()}
@media (prefers-reduced-motion: reduce) {
  [data-reflet-feedback] *,
  [data-reflet-feedback] *::before,
  [data-reflet-feedback] *::after,
  .reflet-dialog,
  .reflet-dialog::backdrop {
    animation-duration: 1ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 1ms !important;
  }

  [data-reflet-feedback] button:active:not(:disabled) {
    transform: none;
  }
}
`;
}
