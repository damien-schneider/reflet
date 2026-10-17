export const REPORT_STYLES = `
.dt-ses-report { display: flex; flex-direction: column; gap: 6px; width: 100%; min-width: 0; margin: 0; }
.dt-ses-report + .dt-ses-report { margin-top: 12px; }
.dt-ses-report-canvas { position: relative; width: 100%; }
.dt-ses-report-canvas img { display: block; width: 100%; max-width: 100%; height: auto; border-radius: 8px; box-shadow: var(--rf-shadow-inset); }
.dt-ses-report-canvas[data-measured="false"] .dt-ses-callout { visibility: hidden; }
.dt-ses-report-mark { --dt-mark: var(--rf-accent); position: absolute; border: 2px solid var(--dt-mark); border-radius: 4px; pointer-events: none; }
.dt-ses-report-lines { position: absolute; inset: 0; overflow: visible; pointer-events: none; }
.dt-ses-report-lines g { color: var(--rf-accent); }
.dt-ses-report-lines line { stroke: currentColor; stroke-width: 1.5; }
.dt-ses-report-lines circle { fill: currentColor; }
.dt-ses-report-mark[data-decision="kept"], .dt-ses-report-lines g[data-decision="kept"] { --dt-mark: var(--rf-success); color: var(--rf-success); }
.dt-ses-report-mark[data-decision="dismissed"], .dt-ses-report-lines g[data-decision="dismissed"] { opacity: .35; }
.dt-ses-callouts { margin: 0; padding: 0; list-style: none; }
.dt-ses-callouts[data-flow="list"] { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; }
.dt-ses-callout {
  --dt-callout-control: 22px; --dt-callout-inset: 3px;
  display: flex; align-items: flex-start; gap: 2px; max-width: 100%; padding: var(--dt-callout-inset);
  border-radius: calc(var(--dt-callout-control) / 2 + var(--dt-callout-inset));
  background: var(--rf-bg); box-shadow: var(--rf-shadow-inset), var(--rf-shadow-low); font-size: 12px; line-height: 16px;
}
.dt-ses-report-canvas .dt-ses-callout { position: absolute; top: 0; left: 0; width: max-content; max-width: min(280px, 100%); }
.dt-ses-callout-number {
  display: grid; place-items: center; flex: none; min-width: var(--dt-callout-control); height: var(--dt-callout-control); padding: 0 6px;
  border-radius: calc(var(--dt-callout-control) / 2); background: var(--rf-accent); color: var(--rf-accent-text, #fff);
  font-size: 11px; font-weight: 650; font-variant-numeric: tabular-nums;
}
.dt-ses-callout[data-decision="kept"] .dt-ses-callout-number { background: var(--rf-success); }
.dt-ses-callout[data-decision="dismissed"] .dt-ses-callout-number { background: var(--rf-text-muted); }
.dt-ses-callout-label { flex: 1 1 auto; min-width: 0; padding: 3px 4px; font-weight: 550; text-align: left; overflow-wrap: anywhere; }
.dt-ses-callout-label:hover { color: var(--rf-accent); }
.dt-ses-callout[data-decision="dismissed"] .dt-ses-callout-label { color: var(--rf-text-muted); text-decoration: line-through; }
.dt-ses-callout-btn {
  display: grid; place-items: center; flex: none; width: var(--dt-callout-control); height: var(--dt-callout-control);
  border-radius: calc(var(--dt-callout-control) / 2); color: var(--rf-text-muted);
  transition: background-color 120ms var(--rf-ease), color 120ms var(--rf-ease);
}
.dt-ses-callout-btn svg { width: 13px; height: 13px; }
.dt-ses-callout-btn:hover { background: var(--rf-bg-hover); color: var(--rf-text); }
.dt-ses-callout-btn[data-decision="kept"][aria-pressed="true"] { background: var(--rf-success); color: #fff; }
.dt-ses-callout-btn[data-decision="dismissed"][aria-pressed="true"] { background: var(--rf-bg-hover); color: var(--rf-text); }
`;
