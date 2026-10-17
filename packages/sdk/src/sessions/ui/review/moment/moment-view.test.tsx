import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { SessionApiError } from "../../../api/session-api";
import type { SegmentContext, SessionDetail } from "../../../protocol";
import { aContextItem } from "../../testing/intention-fixtures";
import {
  aDetail,
  anEvidence,
  aSegment,
  fakeApi,
  fakeWorkspace,
  renderInWorkspace,
  reviewLinks,
} from "../../testing/session-fixtures";
import { SessionReview } from "../session-review";
import { withSegment } from "../use-session-detail";

vi.mock("../../../local/local-sessions", () => ({
  purgeAccount: vi.fn(),
  useSyncStatus: () => ({
    blockedBy: null,
    isOnline: true,
    lastError: null,
    pendingBytes: 0,
    pendingOperations: 0,
  }),
}));

afterEach(cleanup);

function detailWith(item: Partial<SegmentContext>, evidence = [anEvidence()]) {
  return aDetail({
    evidence,
    segments: [aSegment({ context: [aContextItem(item)] })],
  });
}

async function openMoment(detail: SessionDetail, api = fakeApi()) {
  let served = detail;
  const { setSegmentContext } = api;
  api.setSegmentContext = vi.fn(async (body) => {
    const saved = await setSegmentContext(body);
    served = withSegment(served, saved);
    return saved;
  });
  api.detail = vi.fn(async () => served);
  renderInWorkspace(
    <SessionReview
      isBriefOpen={false}
      links={reviewLinks()}
      sessionId="session_1"
    />,
    fakeWorkspace({ api })
  );
  await screen.findByRole("heading", { name: detail.session.title });
  const viewMenu = screen.queryByRole("button", { name: "Show intentions" });
  if (viewMenu) {
    fireEvent.click(viewMenu);
    fireEvent.click(screen.getByRole("menuitemradio", { name: "Details" }));
  }
  fireEvent.click(
    screen.getByRole("button", { description: "Show the moment" })
  );
  return api;
}

function outline(image: HTMLElement) {
  return image.parentElement?.querySelector<HTMLElement>(".dt-ses-shot-mark");
}

it("outlines the element and the pointer when the screenshot shows that exact moment", async () => {
  await openMoment(
    detailWith({ evidenceId: "evidence_1", evidenceMatch: "exact" })
  );

  const image = screen.getByRole("img", {
    name: "Screenshot at 02:14, “Save” outlined",
  });
  expect(outline(image)?.style).toMatchObject({
    height: "5%",
    left: "10%",
    top: "37.5%",
    width: "20%",
  });
  expect(
    image.parentElement?.querySelector(".dt-ses-shot-pointer")
  ).toBeTruthy();
  expect(screen.queryByText(/Approximate/)).toBeNull();
});

it("marks the outline as approximate when the screenshot was taken later", async () => {
  await openMoment(
    detailWith({
      evidenceId: "evidence_1",
      evidenceMatch: "approximate",
      evidenceOffsetMs: 3200,
    })
  );

  const image = screen.getByRole("img", {
    name: "Screenshot at 02:14, “Save” outlined approximately",
  });
  expect(outline(image)?.dataset.match).toBe("approximate");
  expect(
    screen.getByText("Approximate — screenshot taken 3.2 s after")
  ).toBeTruthy();
});

it("draws no outline on a screenshot that may show another state", async () => {
  await openMoment(
    detailWith({ evidenceId: "evidence_1", evidenceMatch: null })
  );

  const image = screen.getByRole("img", { name: "Screenshot at 02:14" });
  expect(outline(image)).toBeFalsy();
  expect(
    screen.getByText(/it may show another state of the page/)
  ).toBeTruthy();
});

it("says when the screenshot was removed or never taken", async () => {
  await openMoment(
    detailWith({ evidenceId: "evidence_1", evidenceMatch: "exact" }, [
      anEvidence({
        image: null,
        missingReason: "Removed from the session.",
        status: "missing",
      }),
    ])
  );
  expect(
    screen.getByText("Screenshot removed: Removed from the session.")
  ).toBeTruthy();
  cleanup();

  await openMoment(detailWith({ evidenceId: null }));
  expect(screen.getByText("No screenshot at this moment")).toBeTruthy();
});

const PRICE_OPTION = {
  choice: { atMs: 1000, eventKind: "select" as const, kind: "event" as const },
  item: aContextItem({
    atMs: 1000,
    element: {
      component: null,
      label: "Price",
      rect: { height: 20, width: 80, x: 40, y: 120 },
      role: null,
      selector: "#price",
      source: null,
    },
    kind: "select",
    label: "Price",
  }),
  selected: false,
};

function correctionApi(setSegmentContext = vi.fn()) {
  return fakeApi({
    contextChoices: vi
      .fn()
      .mockResolvedValue([
        { choice: { kind: "auto" }, item: aContextItem(), selected: true },
        PRICE_OPTION,
      ]),
    setSegmentContext,
  });
}

it("saves a corrected context against the passage revision", async () => {
  const api = await openMoment(
    detailWith({}),
    correctionApi(
      vi.fn().mockResolvedValue(
        aSegment({
          context: [PRICE_OPTION.item],
          contextCorrectedAt: 1,
          contextOrigin: "human",
          revision: 3,
        })
      )
    )
  );

  fireEvent.click(screen.getByRole("button", { name: "Change context" }));
  fireEvent.click(
    await screen.findByRole("radio", {
      name: "Pointed at explicitly · Price · 1.0 s before",
    })
  );
  fireEvent.click(screen.getByRole("button", { name: "Save context" }));

  await waitFor(() =>
    expect(api.setSegmentContext).toHaveBeenCalledWith({
      choice: PRICE_OPTION.choice,
      expectedRevision: 2,
      segmentId: "segment_1",
    })
  );
  expect(await screen.findByText("Corrected by you")).toBeTruthy();
  expect(screen.getByText("Context corrected")).toBeTruthy();
});

it("asks to reload when someone corrected the context first", async () => {
  const api = await openMoment(
    detailWith({}),
    correctionApi(
      vi
        .fn()
        .mockRejectedValue(
          new SessionApiError("Stale", { limit: null, status: 409 })
        )
    )
  );

  fireEvent.click(screen.getByRole("button", { name: "Change context" }));
  fireEvent.click(
    await screen.findByRole("radio", { name: "Context unknown" })
  );
  fireEvent.click(screen.getByRole("button", { name: "Save context" }));

  expect(
    await screen.findByText(
      "Someone changed this since you opened it. Reload it, then edit again."
    )
  ).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Reload" }));
  await waitFor(() => expect(api.detail).toHaveBeenCalledTimes(2));
});
