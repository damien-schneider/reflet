import { expect, it } from "vitest";
import { aDetail, anEvidence, aSegment } from "../../testing/session-fixtures";
import { transcriptForAgent } from "./transcript-export";

const SAVE_BUTTON = {
  component: "SaveButton",
  label: 'button "Save"',
  rect: { height: 32, width: 80, x: 10, y: 20 },
  role: "button",
  selector: "#save",
  source: "src/settings/save-button.tsx:12",
};

it("gives an agent each passage with the hovered element's locators and its screenshot link", () => {
  const transcript = transcriptForAgent(
    aDetail({
      evidence: [
        anEvidence({
          element: SAVE_BUTTON,
          id: "evidence_hover",
          image: {
            height: 600,
            url: "https://files.test/hover.png",
            width: 800,
          },
          trigger: "hover",
        }),
      ],
      segments: [
        aSegment({
          context: [
            {
              atMs: 2500,
              durationMs: 2100,
              element: SAVE_BUTTON,
              evidenceId: "evidence_hover",
              evidenceMatch: "exact",
              evidenceOffsetMs: 600,
              frame: null,
              kind: "dwell",
              label: 'button "Save"',
              pointer: null,
              url: "https://app.test/settings",
            },
          ],
          text: "This button  is hard to find.",
        }),
      ],
    })
  );

  expect(transcript).toContain("[00:02] This button is hard to find.");
  expect(transcript).toContain(
    '  - Hovered 2.1 s at 00:02: button "Save" on /settings — in <SaveButton> · selector: #save · source: src/settings/save-button.tsx:12 — screenshot: https://files.test/hover.png'
  );
  expect(transcript).toContain(
    '- 02:14 · Long hover · button "Save" — in <SaveButton> · selector: #save · source: src/settings/save-button.tsx:12 — https://files.test/hover.png'
  );
});

it("says who spoke each part of a passage when several people talked", () => {
  const transcript = transcriptForAgent(
    aDetail({
      segments: [
        aSegment({
          speech: [
            { speaker: "S1", text: "Bon, on fait le point." },
            { speaker: null, text: "Euh," },
            { speaker: "S2", text: "Moi je trouve que\nc'est long." },
          ],
          startMs: 10_000,
          text: "Bon, on fait le point. Euh, Moi je trouve que\nc'est long.",
        }),
      ],
    })
  );

  expect(transcript).toContain(
    "[00:10] Speaker 1: Bon, on fait le point. Euh, Speaker 2: Moi je trouve que c'est long."
  );
});
