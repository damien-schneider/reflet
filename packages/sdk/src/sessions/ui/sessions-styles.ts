import { REFLET_Z_INDEX } from "../../z-index";
import { INTENTION_STYLES } from "./intention-styles";
import { REPORT_STYLES } from "./review/screens/report-styles";

const MONO_FONT = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

const RECORDING_STYLES = `
.dt-rec {
  position: fixed; z-index: ${REFLET_Z_INDEX.devtoolsBar}; left: 50%; translate: -50% 0;
  bottom: calc(var(--rf-viewport-bottom, 0px) + env(safe-area-inset-bottom) + 16px);
  display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 6px;
  max-width: calc(100vw - 24px); padding: 6px 6px 6px 12px; border-radius: 18px;
  animation: dt-rec-in 240ms var(--rf-ease);
}
@keyframes dt-rec-in { from { transform: translateY(8px); opacity: 0; } }
.dt-rec-dot { flex: none; width: 9px; height: 9px; border-radius: 50%; background: var(--rf-danger); }
.dt-rec[data-phase="recording"] .dt-rec-dot { animation: dt-rec-pulse 1.6s ease-in-out infinite; }
.dt-rec[data-phase="paused"] .dt-rec-dot, .dt-rec[data-phase="finishing"] .dt-rec-dot { background: var(--rf-text-muted); }
@keyframes dt-rec-pulse { 50% { opacity: .35; } }
.dt-rec-meter { display: inline-flex; align-items: center; gap: 2px; height: 16px; }
.dt-rec-meter span {
  width: 3px; height: 100%; border-radius: 2px; background: var(--rf-text-muted);
  scale: 1 calc(.2 + var(--dt-level, 0) * .8); transition: scale 90ms linear;
}
.dt-rec-meter span:nth-child(2) { scale: 1 calc(.2 + var(--dt-level, 0)); }
.dt-rec-time { font-variant-numeric: tabular-nums; font-weight: 600; min-width: 5ch; }
.dt-rec-status { color: var(--rf-text-muted); font-size: 12px; overflow-wrap: anywhere; }
.dt-rec-status:empty { display: none; }
.dt-rec-note { display: flex; align-items: center; gap: 6px; flex: 1 1 100%; font-size: 12px; color: var(--rf-text-muted); }
.dt-rec-note .dt-field { flex: 1; min-width: 0; padding: 4px 8px; }
`;

const LIST_STYLES = `
.dt-ses-subhead, .dt-ses-label { margin: 0 0 4px; font-size: 12px; font-weight: 600; color: var(--rf-text); }
.dt-ses-label { font-size: 11px; color: var(--rf-text-muted); }
.dt-ses-list { margin: 0; padding-left: 18px; overflow-wrap: anywhere; }
.dt-ses-list li + li { margin-top: 3px; }
.dt-ses-link { align-self: flex-start; padding: 0; color: var(--rf-accent); font-size: 12px; text-align: left; }
.dt-ses-link:hover { text-decoration: underline; }
.dt-ses-problem, .dt-ses-banner, .dt-ses-form, .dt-ses-head, .dt-ses-strip, .dt-ses-handoff { display: flex; flex-direction: column; gap: 6px; }
.dt-ses-banner { padding: 8px 10px; border-radius: 10px; background: color-mix(in srgb, var(--rf-accent) 10%, transparent); }
.dt-ses-banner p { margin: 0; overflow-wrap: anywhere; }
.dt-ses-strip:empty { display: none; }
.dt-ses-rows { display: flex; flex-direction: column; gap: 4px; margin: 0; padding: 0; list-style: none; }
.dt-ses-row {
  display: flex; flex-direction: column; align-items: flex-start; gap: 2px; width: 100%;
  padding: 8px 10px; border-radius: 10px; background: var(--rf-bg-subtle); text-align: left;
}
button.dt-ses-row:hover { background: var(--rf-bg-hover); }
.dt-ses-row .dt-card-title { max-width: 100%; }
`;

const REVIEW_STYLES = `
.dt-ses-title { flex: 1; min-width: 0; margin: 0; font-size: 15px; font-weight: 650; overflow-wrap: anywhere; }
.dt-ses-menu { position: relative; flex: none; }
.dt-ses-menu > .icon-btn { width: 30px; height: 30px; }
.dt-ses-menu-list {
  position: absolute; top: calc(100% + 4px); right: 0; z-index: 2; display: flex; flex-direction: column; min-width: 168px; padding: 4px;
  border: 1px solid var(--rf-border); border-radius: var(--rf-radius-sm); background: var(--rf-bg); box-shadow: var(--rf-shadow);
}
.dt-ses-menu-item { display: flex; align-items: center; height: 30px; padding: 0 10px; border-radius: 6px; color: var(--rf-text); font-size: 12.5px; text-align: left; }
.dt-ses-menu-item:hover, .dt-ses-menu-item:focus-visible { background: var(--rf-bg-hover); }
.dt-ses-menu-item[data-variant="danger"] { color: var(--rf-danger); }
.dt-btn[data-icon-only] { justify-content: center; width: 28px; padding: 0; }
.dt-ses-tabs { flex-wrap: wrap; margin: 0; }
.dt-ses-field { display: flex; flex-direction: column; gap: 3px; font-size: 11.5px; color: var(--rf-text-muted); }
.dt-ses-need {
  margin: 0; font-weight: 600; overflow-wrap: anywhere;
  display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden;
}
.dt-ses-need[data-expanded="true"] { display: block; }
.dt-card[data-decision="dismissed"] .dt-ses-need { color: var(--rf-text-muted); text-decoration: line-through; }
.dt-ses-chips { display: flex; flex-wrap: wrap; gap: 4px; }
.dt-ses-chips:empty { display: none; }
.dt-ses-details { display: flex; flex-direction: column; gap: 8px; }
.dt-ses-details[hidden] { display: none; }
.dt-ses-details section { display: flex; flex-direction: column; gap: 2px; }
.dt-ses-quote { padding: 2px 0; font-size: 12px; text-align: left; overflow-wrap: anywhere; }
.dt-ses-quote:hover { color: var(--rf-accent); }
.dt-ses-time { flex: none; color: var(--rf-text-muted); font: 11.5px ${MONO_FONT}; font-variant-numeric: tabular-nums; }
.dt-ses-verify { display: flex; flex-direction: column; gap: 6px; margin: 0; padding: 8px 0 0; border: 0; border-top: 1px solid var(--rf-border); }
.dt-ses-timeline { display: flex; flex-direction: column; gap: 2px; margin: 0; padding: 0; list-style: none; }
.dt-ses-seg { display: flex; gap: 8px; padding: 6px 8px; border-radius: 8px; }
.dt-ses-seg:focus { outline: 2px solid var(--rf-accent); outline-offset: -2px; }
.dt-ses-seg[data-kind="note"] { padding-block: 2px; }
.dt-ses-seg-body { display: flex; flex: 1; flex-direction: column; gap: 4px; min-width: 0; }
`;

const EVIDENCE_STYLES = `
.dt-ses-thumbs { display: flex; flex-wrap: wrap; gap: 6px; }
.dt-ses-shot { position: relative; display: inline-block; max-width: 100%; line-height: 0; }
.dt-ses-shot img { display: block; max-width: 100%; height: auto; max-height: 132px; border-radius: 8px; box-shadow: var(--rf-shadow-inset); }
.dt-ses-shot[data-large="true"] img { max-height: none; }
.dt-ses-shot-mark { position: absolute; border: 2px solid var(--rf-accent); border-radius: 4px; pointer-events: none; }
.dt-ses-shot-btn { align-self: flex-start; padding: 0; border-radius: 8px; }
.dt-ses-check { display: flex; align-items: flex-start; gap: 6px; overflow-wrap: anywhere; }
.dt-ses-check input { flex: none; margin-top: 3px; accent-color: var(--rf-accent); }
.dt-ses-choices { margin: 0; padding: 0; border: 0; }
.dt-ses-choices .dt-ses-list { padding-left: 0; list-style: none; }
.dt-ses-brief {
  max-height: 50vh; overflow: auto; margin: 0; padding: 10px; border-radius: 10px;
  background: var(--rf-bg-subtle); font: 11.5px/1.55 ${MONO_FONT}; white-space: pre-wrap; overflow-wrap: anywhere;
}
`;

const TEAM_STYLES = `
.dt-team-anchor {
  --dt-edge-gap: calc(max(var(--rf-offset), 12px) + 48px);
  position: fixed; z-index: ${REFLET_Z_INDEX.devtoolsBar}; width: min(300px, calc(100vw - 24px));
}
.dt-team-anchor[data-side="left"] { left: calc(var(--rf-viewport-left, 0px) + max(12px, var(--rf-offset))); }
.dt-team-anchor[data-side="right"] { right: calc(var(--rf-viewport-right, 0px) + max(12px, var(--rf-offset))); }
.dt-team-anchor[data-edge="bottom"] { bottom: calc(var(--rf-viewport-bottom, 0px) + env(safe-area-inset-bottom) + var(--dt-edge-gap)); }
.dt-team-anchor[data-edge="top"] { top: calc(var(--rf-viewport-top, 0px) + env(safe-area-inset-top) + var(--dt-edge-gap)); }
.dt-team-card { display: flex; flex-direction: column; gap: 6px; padding: 12px 14px; border-radius: 14px; animation: dt-popover-in 200ms var(--rf-ease); }
.dt-bar > .dt-btn { margin-inline: 2px 4px; }
`;

export const SESSIONS_STYLES = `${RECORDING_STYLES}${LIST_STYLES}${REVIEW_STYLES}${EVIDENCE_STYLES}${TEAM_STYLES}${INTENTION_STYLES}${REPORT_STYLES}`;
