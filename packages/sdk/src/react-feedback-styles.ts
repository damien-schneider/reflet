/**
 * Self-contained styles for the FeedbackButton and FeedbackDialog components.
 * Uses CSS custom properties for theming. Injected via <style> tag with a unique ID
 * to avoid duplication. All selectors are scoped under `[data-reflet-feedback]`.
 */

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
[data-reflet-feedback] {
  --reflet-primary: #6366f1;
  --reflet-primary-hover: #4f46e5;
  --reflet-bg: #ffffff;
  --reflet-bg-secondary: #f9fafb;
  --reflet-text: #111827;
  --reflet-text-secondary: #6b7280;
  --reflet-text-tertiary: #9ca3af;
  --reflet-border: #e5e7eb;
  --reflet-radius: 12px;
  --reflet-radius-sm: 8px;
  --reflet-shadow: 0 20px 60px -12px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.05);
  --reflet-font: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --reflet-success: #22c55e;
  --reflet-error: #ef4444;
}

@media (prefers-color-scheme: dark) {
  [data-reflet-feedback][data-theme="auto"] {
    --reflet-bg: #1f2937;
    --reflet-bg-secondary: #111827;
    --reflet-text: #f9fafb;
    --reflet-text-secondary: #9ca3af;
    --reflet-text-tertiary: #6b7280;
    --reflet-border: #374151;
    --reflet-shadow: 0 20px 60px -12px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05);
  }
}

[data-reflet-feedback][data-theme="dark"] {
  --reflet-bg: #1f2937;
  --reflet-bg-secondary: #111827;
  --reflet-text: #f9fafb;
  --reflet-text-secondary: #9ca3af;
  --reflet-text-tertiary: #6b7280;
  --reflet-border: #374151;
  --reflet-shadow: 0 20px 60px -12px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05);
}

/* ===== Overlay ===== */
.reflet-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  z-index: 99998;
  animation: reflet-fade-in 150ms ease-out;
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

.reflet-overlay[data-closing="true"] {
  animation: reflet-fade-out 150ms ease-in forwards;
}

/* ===== Dialog (Desktop) ===== */
.reflet-dialog {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 99999;
  background: var(--reflet-bg);
  border-radius: var(--reflet-radius);
  box-shadow: var(--reflet-shadow);
  width: 480px;
  max-width: calc(100vw - 32px);
  max-height: calc(100vh - 64px);
  overflow: hidden;
  font-family: var(--reflet-font);
  color: var(--reflet-text);
  animation: reflet-scale-in 200ms cubic-bezier(0.16, 1, 0.3, 1);
}

.reflet-dialog[data-closing="true"] {
  animation: reflet-scale-out 150ms ease-in forwards;
}

/* ===== Sheet (Mobile) ===== */
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
    max-height: 90vh;
    animation: reflet-slide-up 300ms cubic-bezier(0.16, 1, 0.3, 1);
  }

  .reflet-dialog[data-closing="true"] {
    animation: reflet-slide-down 200ms ease-in forwards;
  }
}

/* ===== Header ===== */
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
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 8px;
  color: var(--reflet-text-secondary);
  cursor: pointer;
  padding: 0;
  flex-shrink: 0;
  transition: background 150ms, color 150ms;
}

.reflet-close:hover {
  background: var(--reflet-bg-secondary);
  color: var(--reflet-text);
}

.reflet-close svg {
  width: 18px;
  height: 18px;
}

/* ===== Form ===== */
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

/* ===== Category Selector ===== */
.reflet-categories {
  display: flex;
  gap: 8px;
}

.reflet-category {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--reflet-border);
  border-radius: var(--reflet-radius-sm);
  background: var(--reflet-bg);
  color: var(--reflet-text-secondary);
  font-family: var(--reflet-font);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  text-align: center;
  transition: all 150ms;
}

.reflet-category:hover {
  border-color: var(--reflet-primary);
  color: var(--reflet-text);
}

.reflet-category[data-selected="true"] {
  border-color: var(--reflet-primary);
  background: color-mix(in srgb, var(--reflet-primary) 8%, transparent);
  color: var(--reflet-primary);
}

/* ===== Footer ===== */
.reflet-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 4px;
}

.reflet-btn {
  padding: 10px 20px;
  border: none;
  border-radius: var(--reflet-radius-sm);
  font-family: var(--reflet-font);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 150ms;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  line-height: 1;
}

.reflet-btn-primary {
  background: var(--reflet-primary);
  color: #ffffff;
}

.reflet-btn-primary:hover:not(:disabled) {
  background: var(--reflet-primary-hover);
}

.reflet-btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.reflet-btn-secondary {
  background: transparent;
  color: var(--reflet-text-secondary);
}

.reflet-btn-secondary:hover {
  background: var(--reflet-bg-secondary);
  color: var(--reflet-text);
}

/* ===== Spinner ===== */
.reflet-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: reflet-spin 600ms linear infinite;
}

/* ===== Success State ===== */
.reflet-success {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
  gap: 16px;
}

.reflet-success-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--reflet-success) 12%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
}

.reflet-success-icon svg {
  width: 28px;
  height: 28px;
  color: var(--reflet-success);
}

.reflet-success-icon svg path {
  stroke-dasharray: 24;
  stroke-dashoffset: 24;
  animation: reflet-checkmark 400ms ease-out 100ms forwards;
}

.reflet-success-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--reflet-text);
  margin: 0;
}

.reflet-success-text {
  font-size: 14px;
  color: var(--reflet-text-secondary);
  margin: 0;
}

/* ===== Error State ===== */
.reflet-error-msg {
  font-size: 13px;
  color: var(--reflet-error);
  margin: 0;
}

/* ===== Trigger Button ===== */
.reflet-trigger {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  background: var(--reflet-primary);
  color: #ffffff;
  border: none;
  border-radius: var(--reflet-radius-sm);
  font-family: var(--reflet-font);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 150ms;
  line-height: 1;
}

.reflet-trigger:hover {
  background: var(--reflet-primary-hover);
}

.reflet-trigger svg {
  width: 16px;
  height: 16px;
}

/* ===== Honeypot ===== */
.reflet-hp {
  position: absolute;
  top: -9999px;
  left: -9999px;
  opacity: 0;
  height: 0;
  width: 0;
  z-index: -1;
}

/* ===== Powered by ===== */
.reflet-powered {
  text-align: center;
  padding: 0 24px 16px;
  font-size: 11px;
  color: var(--reflet-text-tertiary);
}

.reflet-powered a {
  color: var(--reflet-text-secondary);
  text-decoration: none;
  font-weight: 500;
}

.reflet-powered a:hover {
  color: var(--reflet-primary);
}

/* ===== Mobile handle ===== */
@media (max-width: 640px) {
  .reflet-header::before {
    content: '';
    position: absolute;
    top: 8px;
    left: 50%;
    transform: translateX(-50%);
    width: 36px;
    height: 4px;
    border-radius: 2px;
    background: var(--reflet-border);
  }

  .reflet-header {
    position: relative;
    padding-top: 24px;
  }
}
`;
}
