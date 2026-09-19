export const COMPOSER_STYLES = `
.panel { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 8px; outline: none; animation: rf-in 240ms var(--rf-ease); }
.success-panel { border-radius: var(--rf-radius); }
.composer { position: relative; display: flex; flex-direction: column; gap: 8px; }
.message-row { display: flex; align-items: flex-end; gap: 4px; padding: 4px; border-radius: 26px; }
.message-row textarea {
  flex: 1; width: 0; min-height: 36px; height: 36px; max-height: min(140px, 30dvh);
  margin: 0; padding: 8px 10px 8px 12px; border: 0; border-radius: 20px; resize: none;
  background: transparent; line-height: 20px; transition: height 220ms var(--rf-ease);
}
.panel:focus-within .message-row[data-expanded="true"] textarea { height: 76px; }
.message-row textarea::placeholder { color: var(--rf-text-muted); }
.message-row textarea:focus { outline: none; }
.message-row:has(textarea:focus-visible) { border-color: color-mix(in srgb, var(--rf-accent) 40%, var(--rf-glass-stroke)); }
.submit { display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; flex: none; border-radius: var(--rf-pill); background: var(--rf-primary); color: var(--rf-primary-text); transition: opacity 160ms var(--rf-ease), transform 160ms var(--rf-ease); }
.submit svg { transform: rotate(-45deg); }
.submit:hover:enabled { transform: scale(1.05); }
.submit:disabled { background: var(--rf-bg-hover); color: var(--rf-text-muted); opacity: .65; }
.composer-toolbar { display: flex; align-items: center; justify-content: flex-end; gap: 8px; flex-wrap: wrap; }
.composer-controls { display: flex; align-items: center; gap: 2px; padding: 3px; border-radius: var(--rf-pill); }
.select-control { position: relative; display: flex; align-items: center; min-width: 0; }
.select-control > svg { position: absolute; right: 9px; width: 12px; height: 12px; pointer-events: none; color: var(--rf-text-muted); }
.category-select { appearance: none; min-width: 0; max-width: 124px; height: 32px; padding: 0 26px 0 12px; border: 0; border-radius: var(--rf-pill); color: var(--rf-text); background: transparent; cursor: pointer; text-overflow: ellipsis; }
.category-select:hover:hover { background: var(--rf-bg-hover); }
option { background: var(--rf-bg); color: var(--rf-text); }
.composer-options { position: relative; }
summary { cursor: pointer; list-style: none; }
summary::-webkit-details-marker { display: none; }
.options-popover { position: absolute; z-index: 2; right: 0; bottom: calc(100% + 12px); width: min(240px, calc(100vw - 40px)); max-height: calc(50dvh - 68px); overflow-y: auto; display: flex; flex-direction: column; gap: 8px; padding: 12px; border-radius: var(--rf-radius); animation: rf-in 160ms var(--rf-ease); }
.composer-options[data-placement="below"] .options-popover { top: calc(100% + 12px); bottom: auto; }
.email-field { display: flex; flex-direction: column; gap: 6px; color: var(--rf-text-muted); font-size: 12px; }
.email-field [role="alert"] { color: var(--rf-danger); }
.email-field input { width: 100%; padding: 9px; border: 1px solid var(--rf-border); border-radius: var(--rf-radius-sm); background: var(--rf-bg-subtle); color: var(--rf-text); }
.dismiss-btn { min-height: 32px; text-align: left; padding: 0 8px; border-radius: var(--rf-radius-sm); color: var(--rf-text-muted); }
.dismiss-btn:hover { background: var(--rf-bg-hover); }
.version-info { font-size: 10px; color: var(--rf-text-muted); padding: 4px 8px 0; border-top: 1px solid var(--rf-border); text-decoration: none; }
.version-info:hover { color: var(--rf-text); }
.attachments { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; }
.screenshot-scroll-area { position: relative; min-width: 0; max-width: calc(100% + 8px); margin: -4px -4px -8px; }
.screenshot-strip { width: 100%; padding: 4px 4px 8px; overscroll-behavior-x: contain; --rf-fade-start: 0px; --rf-fade-end: 0px; mask-image: linear-gradient(to right, transparent, black var(--rf-fade-start), black calc(100% - var(--rf-fade-end)), transparent); mask-repeat: no-repeat; }
.screenshot-strip[data-overflow-x-start] { --rf-fade-start: min(24px, var(--scroll-area-overflow-x-start)); }
.screenshot-strip[data-overflow-x-end] { --rf-fade-end: min(24px, var(--scroll-area-overflow-x-end)); }
.screenshot-strip-content { display: flex; align-items: flex-end; gap: 8px; }
.screenshot-scroll-area:has(.screenshot-strip-content:empty) { display: none; }
.attachments:has(.screenshot-strip-content:empty):not(:has(.selection-chip)) { display: none; }
.screenshot-scrollbar { height: 4px; margin: 0 8px 2px; opacity: 0; transition: opacity 150ms var(--rf-ease); }
.screenshot-scrollbar[data-hovering], .screenshot-scrollbar[data-scrolling] { opacity: 1; }
.screenshot-scroll-thumb { border-radius: var(--rf-pill); background: var(--rf-border); }
.capture-progress { position: absolute; inset: 3px; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 6px; border-radius: 16px; color: var(--rf-text-muted); font-size: 10px; }
.attachments:empty { display: none; }
.screenshot-attachment, .attachment-skeleton { position: relative; flex: none; margin: 0; min-width: 0; width: 128px; height: 78px; padding: 3px; border-radius: var(--rf-radius); animation: rf-in 260ms var(--rf-ease); }
.screenshot-preview { display: block; position: relative; width: 100%; height: 100%; padding: 0; overflow: hidden; border-radius: 16px; }
.screenshot-preview img, .screenshot-preview canvas { width: 100%; height: 100%; display: block; object-fit: cover; object-position: top center; }
.screenshot-preview canvas { position: absolute; inset: 0; pointer-events: none; }
.attachment-caption { position: absolute; left: 5px; bottom: 5px; display: flex; align-items: center; gap: 4px; padding: 3px 6px; font-size: 10px; border-radius: var(--rf-pill); color: var(--rf-text); }
.attachment-caption svg { width: 12px; height: 12px; }
.annotation-count { color: var(--rf-text); font-weight: 600; }
.attachment-actions { position: absolute; right: 4px; bottom: -4px; display: flex; gap: 1px; padding: 1px; border-radius: var(--rf-pill); opacity: 0; pointer-events: none; transform: translateY(3px); transition: opacity 150ms var(--rf-ease), transform 150ms var(--rf-ease); }
.screenshot-attachment:hover .attachment-actions, .screenshot-attachment:focus-within .attachment-actions { opacity: 1; pointer-events: auto; transform: none; }
.screenshot-attachment:hover .attachment-caption, .screenshot-attachment:focus-within .attachment-caption { opacity: 0; }
.attachment-skeleton { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: var(--rf-text-muted); font-size: 11px; }
.attachment-skeleton::after { content: ""; position: absolute; inset: 0; border-radius: inherit; background: var(--rf-bg-subtle); animation: rf-fade 800ms alternate infinite; }
.selection-chip { display: flex; align-items: center; max-width: 100%; padding: 3px; border-radius: var(--rf-pill); }
.selection-label { display: flex; align-items: center; min-width: 0; gap: 6px; padding: 0 6px; font-size: 11px; }
.selection-name { flex: none; font-weight: 600; color: var(--rf-accent); }
.selection-label img { object-fit: contain; border-radius: var(--rf-pill); }
@media (pointer: coarse) {
  .category-select { height: 44px; max-width: 96px; }
  .message-row { border-radius: 28px; }
  .message-row textarea { font-size: 16px; min-height: 44px; height: 44px; padding-top: 12px; }
  .submit { width: 44px; height: 44px; }
  .attachment-actions { opacity: 1; pointer-events: auto; transform: none; }
  .attachment-caption { top: 4px; bottom: auto; right: 4px; left: auto; }
  .attachment-caption-label { display: none; }
  .screenshot-attachment:hover .attachment-caption, .screenshot-attachment:focus-within .attachment-caption { opacity: 1; }
  .screenshot-attachment, .attachment-skeleton { height: 96px; }
  .email-field input { font-size: 16px; }
  .dismiss-btn, .selection-label { min-height: 44px; }
}
`;
