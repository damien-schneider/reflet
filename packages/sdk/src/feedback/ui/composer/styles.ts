export const COMPOSER_STYLES = `
.panel { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 8px; outline: none; animation: rf-in 240ms var(--rf-ease); }
.success-panel { border-radius: var(--rf-radius); }
.composer { position: relative; display: flex; flex-direction: column; gap: 8px; }
.message-row { display: flex; flex-direction: column; gap: 2px; padding: 6px; border-radius: 26px; }
.message-row textarea {
  width: 100%; height: 76px; max-height: min(140px, 30dvh);
  margin: 0; padding: 6px 6px 0 8px; border: 0; resize: none;
  background: transparent; line-height: 20px;
}
.message-actions { display: flex; align-items: center; gap: 2px; }
.message-row textarea::placeholder { color: var(--rf-text-muted); }
.message-row textarea:focus { outline: none; }
.message-row:has(textarea:focus-visible) { border-color: color-mix(in srgb, var(--rf-accent) 40%, var(--rf-glass-stroke)); }
.submit { display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; flex: none; border-radius: var(--rf-pill); background: var(--rf-primary); color: var(--rf-primary-text); transition: opacity 160ms var(--rf-ease), transform 160ms var(--rf-ease); }
.submit svg { transform: rotate(-45deg); }
.submit:hover:enabled { transform: scale(1.05); }
.submit:disabled { background: var(--rf-bg-hover); color: var(--rf-text-muted); opacity: .65; }
.composer-toolbar { display: flex; align-items: center; justify-content: flex-end; gap: 8px; flex-wrap: wrap; }
.composer-options { position: relative; }
summary { cursor: pointer; list-style: none; }
summary::-webkit-details-marker { display: none; }
.options-popover { position: absolute; z-index: 2; right: 0; bottom: calc(100% + 12px); width: min(240px, calc(100vw - 40px)); max-height: calc(50dvh - 68px); overflow-y: auto; display: flex; flex-direction: column; gap: 8px; padding: 12px; border-radius: var(--rf-radius); animation: rf-in 160ms var(--rf-ease); }
.composer-options[data-placement="below"] .options-popover { top: calc(100% + 12px); bottom: auto; }
.email-field { display: flex; flex-direction: column; gap: 6px; color: var(--rf-text-muted); font-size: 12px; }
.email-field [role="alert"] { color: var(--rf-danger); }
.email-field input { width: 100%; padding: 9px; border: 1px solid var(--rf-border); border-radius: var(--rf-radius-sm); background: var(--rf-bg-subtle); color: var(--rf-text); }
.dismiss-btn { min-height: 40px; text-align: left; padding: 0 8px; border-radius: var(--rf-radius-sm); color: var(--rf-text-muted); }
.dismiss-btn:hover { background: var(--rf-bg-hover); }
.version-info { font-size: 10px; color: var(--rf-text-muted); padding: 4px 8px 0; border-top: 1px solid var(--rf-border); text-decoration: none; }
.version-info:hover { color: var(--rf-text); }
.email-scrim { display: none; }
.email-prompt { display: flex; flex-direction: column; gap: 12px; padding: 16px; border-radius: 22px; animation: rf-in 240ms var(--rf-ease); }
.email-prompt h2 { margin: 0; font-size: 14px; font-weight: 600; line-height: 1.3; }
.email-prompt p { margin: 0; font-size: 12px; line-height: 1.45; color: var(--rf-text-muted); }
.email-prompt .email-field input { min-height: 40px; border-radius: 14px; padding: 0 12px; }
.email-prompt-actions { display: flex; align-items: center; justify-content: flex-end; gap: 4px; }
.email-prompt-actions .ghost-btn { padding: 0 12px; color: var(--rf-text-muted); }
.primary-btn { display: flex; align-items: center; justify-content: center; min-height: 40px; padding: 0 16px; border-radius: var(--rf-pill); background: var(--rf-primary); color: var(--rf-primary-text); font-weight: 500; }
.primary-btn:hover { opacity: .9; }
.attachments { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; }
.attachment-row { display: flex; align-items: flex-end; gap: 8px; min-width: 0; max-width: 100%; }
.screenshot-scroll-area { position: relative; min-width: 0; margin: -14px -10px -20px; }
.screenshot-strip { width: 100%; padding: 14px 10px 20px; overscroll-behavior-x: contain; --rf-fade-start: 0px; --rf-fade-end: 0px; mask-image: linear-gradient(to right, transparent, black var(--rf-fade-start), black calc(100% - var(--rf-fade-end)), transparent); mask-repeat: no-repeat; }
.screenshot-strip[data-overflow-x-start] { --rf-fade-start: calc(10px + min(24px, var(--scroll-area-overflow-x-start))); }
.screenshot-strip[data-overflow-x-end] { --rf-fade-end: calc(10px + min(24px, var(--scroll-area-overflow-x-end))); }
.screenshot-strip-content { display: flex; align-items: flex-end; gap: 8px; }
.screenshot-scroll-area:has(.screenshot-strip-content:empty) { display: none; }
.capture-slot { display: flex; flex-direction: column; gap: 2px; flex: none; width: 56px; height: var(--rf-attachment-height); padding: 3px; border: 1px dashed var(--rf-border); border-radius: var(--rf-radius); box-shadow: none; }
.capture-action { display: flex; flex: 1; min-height: 0; align-items: center; justify-content: center; border-radius: 5px; color: var(--rf-text-muted); transition: background 160ms var(--rf-ease), color 160ms var(--rf-ease); }
.capture-action:first-child { border-radius: 16px 16px 5px 5px; }
.capture-action:last-child { border-radius: 5px 5px 16px 16px; }
.capture-action:hover:enabled { background: var(--rf-bg-hover); color: var(--rf-text); }
.screenshot-scrollbar { height: 4px; margin: 0 8px 2px; opacity: 0; transition: opacity 150ms var(--rf-ease); }
.screenshot-scrollbar[data-hovering], .screenshot-scrollbar[data-scrolling] { opacity: 1; }
.screenshot-scroll-thumb { border-radius: var(--rf-pill); background: var(--rf-border); }
.capture-progress { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 6px; border-radius: inherit; color: var(--rf-text-muted); font-size: 10px; }
.attachments:empty { display: none; }
.screenshot-attachment, .attachment-skeleton { position: relative; flex: none; margin: 0; min-width: 0; width: 128px; height: var(--rf-attachment-height); padding: 0; border-radius: 16px; animation: rf-in 260ms var(--rf-ease); }
.screenshot-attachment { border: 0; }
.screenshot-preview { display: block; position: relative; width: 100%; height: 100%; padding: 0; border-radius: inherit; overflow: hidden; }
.screenshot-preview img, .screenshot-preview canvas { width: 100%; height: 100%; display: block; object-fit: cover; object-position: top center; }
.screenshot-preview canvas { position: absolute; inset: 0; pointer-events: none; }
.annotation-count { position: absolute; left: 5px; bottom: 5px; min-width: 20px; padding: 2px 6px; border-radius: var(--rf-pill); font-size: 10px; font-weight: 600; font-variant-numeric: tabular-nums; text-align: center; color: var(--rf-text); }
.attachment-actions { position: absolute; right: 4px; bottom: 4px; display: flex; gap: 1px; padding: 1px; border-radius: var(--rf-pill); }
.attachment-actions .icon-btn { width: 28px; height: 28px; }
.attachment-actions svg { width: 14px; height: 14px; }
.attachment-skeleton { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: var(--rf-text-muted); font-size: 11px; }
.attachment-skeleton::after { content: ""; position: absolute; inset: 0; border-radius: inherit; background: var(--rf-bg-subtle); animation: rf-fade 800ms alternate infinite; }
.selection-badge { position: absolute; left: 5px; top: 5px; display: flex; align-items: center; justify-content: center; width: 20px; height: 20px; border-radius: var(--rf-pill); color: var(--rf-accent); }
.selection-badge svg { width: 12px; height: 12px; }
@media (pointer: coarse) {
  .message-row { border-radius: 28px; }
  .capture-slot { width: 64px; }
  .message-row textarea { font-size: 16px; }
  .submit { width: 44px; height: 44px; }
  :host { --rf-attachment-height: 96px; }
  .attachment-actions { right: 5px; bottom: 5px; }
  .attachment-actions .icon-btn { width: 34px; height: 34px; }
  .selection-badge { width: 24px; height: 24px; }
  .email-field input { font-size: 16px; }
  .dismiss-btn { min-height: 44px; }
}
@media (max-width: 480px) {
  .email-scrim { display: block; position: fixed; inset: 0; background: rgb(0 0 0 / 40%); animation: rf-fade 200ms var(--rf-ease); }
  .email-prompt { position: fixed; left: 0; right: 0; bottom: 0; gap: 14px; padding: 20px 16px calc(20px + env(safe-area-inset-bottom)); border-radius: 26px 26px 0 0; animation: rf-drawer-in 280ms var(--rf-ease); }
  .email-prompt h2 { font-size: 17px; }
  .email-prompt p { font-size: 13px; }
  .email-prompt-actions { flex-direction: column-reverse; align-items: stretch; gap: 8px; }
  .email-prompt-actions .ghost-btn, .email-prompt-actions .primary-btn { justify-content: center; min-height: 48px; }
}
@keyframes rf-drawer-in { from { transform: translateY(100%); } }
`;
