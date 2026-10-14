import { expect, it } from "vitest";
import type { ElementRef, SessionProposal } from "../../../protocol";
import { aContextItem } from "../../testing/intention-fixtures";
import { aDetail, anEvidence, aProposal } from "../../testing/session-fixtures";
import { calloutReport } from "./callout-report";

const SAVE_BUTTON: ElementRef = {
  component: "SettingsForm",
  label: 'button "Save"',
  rect: { height: 40, width: 100, x: 800, y: 80 },
  role: "button",
  selector: "#save",
  source: null,
};

const detailWith = (calloutTarget: SessionProposal["calloutTarget"]) =>
  aDetail({
    evidence: [
      anEvidence({ frame: aContextItem().frame, id: "evidence_1" }),
      anEvidence({ id: "evidence_removed", image: null, status: "missing" }),
    ],
    proposals: [aProposal({ calloutTarget })],
  });

it("frames the located element on its screenshot", () => {
  const [callout] =
    calloutReport(
      detailWith({ element: SAVE_BUTTON, evidenceId: "evidence_1" })
    ).screens[0]?.callouts ?? [];

  expect(callout?.outline).toEqual({
    height: expect.closeTo(0.05),
    width: expect.closeTo(0.1),
    x: expect.closeTo(0.8),
    y: expect.closeTo(0.1),
  });
});

it("pins the label on the screenshot without a frame when nothing recorded matched", () => {
  const report = calloutReport(
    detailWith({ element: null, evidenceId: "evidence_1" })
  );

  expect(report.screens[0]?.callouts[0]?.outline).toBeNull();
});

it("lists the intention off screen when its screenshot is not shown", () => {
  const removed = calloutReport(
    detailWith({ element: SAVE_BUTTON, evidenceId: "evidence_removed" })
  );
  const unpinned = calloutReport(detailWith(null));

  expect(removed.screens).toEqual([]);
  expect(removed.unplaced).toHaveLength(1);
  expect(unpinned.unplaced).toHaveLength(1);
});
