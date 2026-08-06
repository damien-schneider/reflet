export function getFeedbackChromeCSS(): string {
  return `
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
