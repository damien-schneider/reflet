export const LIVE_WINDOW_STYLES = `
.lw {
  position: fixed; inset: 0; overflow: auto;
  display: flex; flex-direction: column; gap: 16px;
  padding: 20px; background: var(--rf-bg);
}
.lw-title { margin: 0; font-size: 15px; font-weight: 650; }
.lw-banner { margin: 0; padding: 8px 10px; border-radius: var(--dt-radius-card); background: color-mix(in srgb, var(--rf-danger) 12%, transparent); color: var(--rf-danger); font-size: 12.5px; }
.lw-section { display: flex; flex-direction: column; gap: 8px; }
.lw-heading { margin: 0; color: var(--rf-text-muted); font-size: 11.5px; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; }
.lw-controls { justify-content: flex-start; align-self: flex-start; padding: 6px; background: var(--rf-bg-subtle); }
.lw-org { display: flex; flex-direction: column; gap: 4px; max-width: 280px; }
.lw-list { display: flex; flex-direction: column; gap: 6px; margin: 0; padding: 0; list-style: none; }
.lw-app { display: flex; align-items: baseline; gap: 8px; }
.lw-dot { flex: none; width: 8px; height: 8px; border-radius: 50%; background: var(--rf-border); }
.lw-app[data-focused="true"] .lw-dot { background: var(--rf-success); }
.lw-agent { margin: 0; color: var(--rf-text-muted); font-size: 12.5px; }
.lw-agent[data-following="true"] { color: var(--rf-success); }
.lw-passage { display: flex; flex-direction: column; gap: 2px; }
.lw-passage-text { white-space: pre-line; overflow-wrap: anywhere; }
`;
