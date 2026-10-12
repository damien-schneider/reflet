import {
  generateSessionAnalysis,
  type ResolvedProposal,
  resolveProposals,
} from "../convex/sessions/ai/analysis_model";
import {
  type AnalysisSource,
  prepareAnalysisPrompt,
} from "../convex/sessions/ai/analysis_prompt";

type Proposal = ResolvedProposal<string, string>;

interface EvalCase {
  failuresOf: (proposals: Proposal[]) => string[];
  name: string;
  source: AnalysisSource<string, string>;
}

const SAVED_NEED = /enregistr|sauvegard/i;
const HISTORY = /historique/i;
const CLAIMED_FAILURE =
  /(a|ont) échoué|n'(a|ont) pas été (enregistr|sauvegard)|ne s'enregistre pas|ne fonctionne pas|erreur|bug|cassé|failed/i;
const EXPORT = /export/i;
const DATE_RANGE = /dat|période|range|period/i;

const frame = (options: { url: string; title: string; scrollY: number }) => ({
  devicePixelRatio: 2,
  scrollX: 0,
  viewportHeight: 900,
  viewportWidth: 1440,
  ...options,
});

const element = (options: {
  label: string;
  role: string;
  selector: string;
}) => ({
  component: null,
  rect: { height: 40, width: 160, x: 480, y: 420 },
  source: null,
  ...options,
});

const ostalPage = frame({
  scrollY: 0,
  title: "Modifier le logement",
  url: "https://app.ostal.test/logements/12/modifier",
});
const ostalForm = element({
  label: "Informations du logement",
  role: "form",
  selector: "form#logement",
});

const ostal: EvalCase = {
  failuresOf: (proposals) => {
    const [proposal] = proposals;
    if (proposals.length !== 1 || !proposal) {
      return [`expected exactly one proposal, got ${proposals.length}`];
    }
    const failures: string[] = [];
    if (!SAVED_NEED.test(proposal.need)) {
      failures.push("the need is not about knowing changes are saved");
    }
    if (!proposal.setAside.some((idea) => HISTORY.test(idea))) {
      failures.push("the history idea is not set aside");
    }
    if (CLAIMED_FAILURE.test(proposal.observed)) {
      failures.push("observed claims a failure nobody saw");
    }
    return failures;
  },
  name: "Ostal: history idea corrected into save confirmation (French)",
  source: {
    events: [
      { atMs: 0, frame: ostalPage, kind: "navigation" },
      {
        atMs: 1500,
        element: ostalForm,
        evidenceClientKey: "select-form",
        frame: ostalPage,
        kind: "select",
        note: null,
      },
      {
        atMs: 9000,
        element: element({
          label: "Loyer mensuel",
          role: "textbox",
          selector: "input[name=loyer]",
        }),
        frame: ostalPage,
        kind: "click",
        pointer: { x: 520, y: 380 },
      },
      {
        atMs: 14_000,
        element: element({
          label: "Enregistrer",
          role: "button",
          selector: "form#logement button[type=submit]",
        }),
        frame: ostalPage,
        kind: "click",
        pointer: { x: 560, y: 720 },
      },
    ],
    evidence: [
      {
        _id: "ev-start",
        atMs: 0,
        frame: ostalPage,
        kind: "screenshot",
        status: "available",
        trigger: "start",
      },
      {
        _id: "ev-form",
        atMs: 1500,
        element: ostalForm,
        frame: ostalPage,
        kind: "screenshot",
        status: "available",
        trigger: "select",
      },
    ],
    handledProposals: [],
    segments: [
      {
        _id: "seg-wish",
        endMs: 4500,
        startMs: 2000,
        text: "Il faudrait un historique.",
      },
      {
        _id: "seg-correction",
        endMs: 21_000,
        startMs: 16_000,
        text: "En fait, je veux surtout savoir si c'est enregistré.",
      },
    ],
    title: "Ostal",
  },
};

const reportsTop = frame({
  scrollY: 0,
  title: "Reports",
  url: "https://app.acme.test/reports",
});
const reportsBottom = { ...reportsTop, scrollY: 1400 };
const exportButton = element({
  label: "Export CSV",
  role: "button",
  selector: "#export-csv",
});

const scrolledButton: EvalCase = {
  failuresOf: (proposals) => {
    const [proposal] = proposals;
    if (proposals.length !== 1 || !proposal) {
      return [`expected exactly one proposal, got ${proposals.length}`];
    }
    const failures: string[] = [];
    if (!(EXPORT.test(proposal.need) || EXPORT.test(proposal.observed))) {
      failures.push("the proposal does not point at the export button");
    }
    if (!DATE_RANGE.test(proposal.need)) {
      failures.push("the need is not about choosing the date range");
    }
    if (!proposal.evidenceIds.includes("ev-export")) {
      failures.push(
        "the screenshot of the scrolled export button is not cited"
      );
    }
    if (proposal.evidenceIds.includes("ev-start")) {
      failures.push("the start screenshot (before the scroll) is cited");
    }
    return failures;
  },
  name: "Reports: 'this button here' after a scroll (English)",
  source: {
    events: [
      { atMs: 0, frame: reportsTop, kind: "navigation" },
      {
        atMs: 1000,
        element: element({
          label: "Share report",
          role: "button",
          selector: "#share",
        }),
        frame: reportsTop,
        kind: "click",
        pointer: { x: 1200, y: 90 },
      },
      { atMs: 3000, kind: "scroll", scrollX: 0, scrollY: 1400 },
      {
        atMs: 6000,
        element: exportButton,
        evidenceClientKey: "select-export",
        frame: reportsBottom,
        kind: "select",
        note: null,
      },
    ],
    evidence: [
      {
        _id: "ev-start",
        atMs: 0,
        frame: reportsTop,
        kind: "screenshot",
        status: "available",
        trigger: "start",
      },
      {
        _id: "ev-export",
        atMs: 6000,
        element: exportButton,
        frame: reportsBottom,
        kind: "screenshot",
        status: "available",
        trigger: "select",
      },
    ],
    handledProposals: [],
    segments: [
      {
        _id: "seg-export",
        endMs: 10_500,
        startMs: 6500,
        text: "This button here should let me choose the date range before it exports.",
      },
    ],
    title: "Reports walkthrough",
  },
};

let failed = false;
for (const evalCase of [ostal, scrolledButton]) {
  const startedAt = Date.now();
  const prepared = prepareAnalysisPrompt(evalCase.source);
  const { proposals } = resolveProposals(
    await generateSessionAnalysis(prepared.prompt),
    prepared
  );
  const failures = evalCase.failuresOf(proposals);
  failed ||= failures.length > 0;
  process.stdout.write(
    `${failures.length === 0 ? "ok  " : "FAIL"} ${Date.now() - startedAt}ms  ${evalCase.name}\n${JSON.stringify(proposals, null, 2)}\n${failures.map((failure) => `  - ${failure}\n`).join("")}\n`
  );
}

if (failed) {
  process.exit(1);
}
