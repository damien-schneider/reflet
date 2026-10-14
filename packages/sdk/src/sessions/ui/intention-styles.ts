export const INTENTION_STYLES = `
.dt-ses-panel { display: contents; }
.dt-ses-panel[hidden] { display: none; }
.dt-ses-moment, .dt-ses-moment-section, .dt-ses-block, .dt-ses-change, .dt-ses-history { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.dt-ses-moment-item { display: flex; flex-direction: column; gap: 6px; padding: 8px 10px; border-radius: var(--dt-radius-card); background: var(--rf-bg-subtle); }
.dt-ses-moment-line { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 0; overflow-wrap: anywhere; }
.dt-ses-moment-quote { display: flex; flex-direction: column; gap: 2px; margin: 0; padding-left: 10px; border-left: 2px solid var(--rf-border); overflow-wrap: anywhere; }
.dt-ses-moment-notices { color: var(--rf-text-muted); font-size: 12px; }
.dt-ses-moment-shot { display: flex; flex-direction: column; gap: 4px; margin: 0; max-width: 100%; }
.dt-ses-shot-mark[data-match="approximate"] { border-style: dashed; }
.dt-ses-shot-pointer {
  position: absolute; width: 10px; height: 10px; margin: -5px 0 0 -5px; border-radius: 50%;
  background: var(--rf-accent); box-shadow: 0 0 0 2px var(--rf-bg); pointer-events: none;
}
.dt-ses-source { margin: 0; font-size: 12px; overflow-wrap: anywhere; }
.dt-ses-context-line { display: block; }
.dt-ses-attached { flex-direction: row; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 6px; }
.dt-ses-attached p { margin: 0; }
.dt-ses-history[data-removed="true"] > .dt-ses-subhead { color: var(--rf-text-muted); text-decoration: line-through; }
.dt-ses-change { padding: 8px 10px; border-radius: var(--dt-radius-card); background: var(--rf-bg-subtle); list-style: none; }
.dt-ses-change[data-decision="rejected"] .dt-ses-diff { color: var(--rf-text-muted); text-decoration: line-through; }
.dt-ses-diff { display: grid; grid-template-columns: auto 1fr; gap: 2px 8px; margin: 0; overflow-wrap: anywhere; }
p.dt-ses-diff { display: block; }
.dt-ses-diff dd { margin: 0; }
.dt-card:focus-visible { outline: 2px solid var(--rf-accent); outline-offset: 2px; }
`;
