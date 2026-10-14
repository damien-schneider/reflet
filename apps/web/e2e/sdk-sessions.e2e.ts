import { expect, type Locator, type Page, test } from "@playwright/test";
import {
  PRECISION,
  PROPOSAL_CALLOUT,
  PROPOSAL_NEED,
  SOLUTION,
} from "./sdk/intention-board";
import {
  CONTINUATION_TEXT,
  copiedText,
  fakeMicrophone,
  microphoneCalls,
  mockSessionBoard,
  type SessionBoard,
  SPOKEN_TEXT,
} from "./sdk/session-board";

const RECORDING_BAR = "[aria-label='Session recording']";
const STOPPED_BY_RELOAD = /stopped when the page reloaded/;
const SCREENSHOT_REMOVAL = /^Remove screenshot at/;
const SHOW_CONTEXT = /^Show context at/;
const MARK_SCREENSHOT = /^Screenshot · mark screenshot/;
const SCREENSHOTS_PER_SESSION = 2;
const CHANGED_SINCE_FIRST_BRIEF = /^Changed since your brief of /;
const PREPARE_ONE_BRIEF = /^Prepare brief\s*1$/;
const BACK_TO_SESSION = "Back to Session";
const EVIDENCE_TAB = new RegExp(`^Evidence\\s*${SCREENSHOTS_PER_SESSION}$`);
const ONE_INTENTION_TAB = /^Intentions\s*1$/;
const NOTHING_SENT = /Nothing is sent to an agent/;
const SECOND_REVISION_OUTCOME = new RegExp(`${PROPOSAL_NEED} \\(revision 2\\)`);
const PRECISION_IN_BRIEF = new RegExp(PRECISION.replace("?", "\\?"));
const SOLUTION_IN_BRIEF = new RegExp(SOLUTION);

type Activate = (target: Locator) => Promise<void>;

const click: Activate = (target) => target.click();
const pressEnter: Activate = async (target) => {
  await target.focus();
  await target.press("Enter");
};

async function openSessions(page: Page) {
  await page.goto("/sdk-demo");
  await expect(
    page.getByRole("heading", { name: "Plans & billing" })
  ).toBeVisible();
  await page
    .getByRole("toolbar", { name: "Reflet devtools" })
    .getByRole("button", { name: "Sessions" })
    .click();
}

async function startRecording(page: Page) {
  await page.getByRole("button", { name: "Start session" }).click();
  await expect(page.locator(RECORDING_BAR)).toBeVisible();
}

function firstSession(board: SessionBoard) {
  const [session] = board.state.sessions;
  if (!session) {
    throw new Error("No session was started");
  }
  return session;
}

async function recordMarkedPassage(
  page: Page,
  activate: Activate,
  board: SessionBoard
) {
  await expect(page.locator(RECORDING_BAR)).toContainText("00:02");
  await activate(page.getByRole("button", { name: "Mark moment" }));
  await expect
    .poll(
      () =>
        board.state.sessions
          .at(-1)
          ?.evidence.filter(({ status }) => status === "available").length
    )
    .toBe(SCREENSHOTS_PER_SESSION);
  await activate(page.getByRole("button", { name: "Finish" }));
  await expect(page.getByRole("tab", { name: EVIDENCE_TAB })).toBeVisible();
}

async function correctPassageContext(page: Page, activate: Activate) {
  await activate(page.getByRole("tab", { exact: true, name: "Transcript" }));
  await expect(page.getByText(SPOKEN_TEXT)).toBeVisible();
  await activate(page.getByRole("button", { name: SHOW_CONTEXT }).first());
  const moment = page.getByRole("region", { name: "Moment" });
  await expect(moment.getByText("Linked automatically")).toBeVisible();
  await activate(moment.getByRole("button", { name: "Change context" }));
  await moment.getByRole("radio", { name: MARK_SCREENSHOT }).check();
  await activate(moment.getByRole("button", { name: "Save context" }));
  await expect(moment.getByText("Corrected by you")).toBeVisible();
  await page.keyboard.press("Escape");
}

async function confirmAndHandOff(page: Page, activate: Activate) {
  await activate(page.getByRole("tab", { name: ONE_INTENTION_TAB }));
  await activate(
    page.getByRole("button", { name: `Confirm “${PROPOSAL_CALLOUT}”` })
  );
  await expect(page.getByText(`Confirmed “${PROPOSAL_NEED}”`)).toBeVisible();
  await activate(page.getByRole("button", { name: "Show intentions" }));
  await activate(page.getByRole("menuitemradio", { name: "Details" }));
  await expect(page.getByText("No considered response yet.")).toBeVisible();
  await activate(page.getByRole("button", { name: PREPARE_ONE_BRIEF }));
  await activate(page.getByRole("button", { name: "Build brief" }));
  await activate(page.getByRole("button", { name: "Copy brief" }));
  await expect(page.getByText("Brief copied").first()).toBeVisible();
  expect(await copiedText(page)).toContain(`${PROPOSAL_NEED} (revision 1)`);
  await activate(page.getByRole("button", { name: BACK_TO_SESSION }));
}

async function continueIntention(
  page: Page,
  activate: Activate,
  board: SessionBoard
) {
  await activate(page.getByRole("button", { name: "Continue this intention" }));
  const recap = page.getByRole("region", { name: "Continue this intention" });
  await expect(recap.getByText(NOTHING_SENT)).toBeVisible();
  await activate(recap.getByRole("button", { name: "Start session" }));
  await recordMarkedPassage(page, activate, board);
}

function changeRow(page: Page, kind: string) {
  return page.locator("li.dt-ses-change", { hasText: kind });
}

async function decideProposedChanges(page: Page, activate: Activate) {
  await expect(page.getByText(`Continues “${PROPOSAL_NEED}”`)).toBeVisible();
  const precision = changeRow(page, "Precision");
  const solution = changeRow(page, "Different solution");
  await expect(precision.getByText(`+ ${PRECISION}`)).toBeVisible();
  await expect(precision.getByText(CONTINUATION_TEXT)).toBeVisible();
  await expect(precision.getByRole("img")).toHaveCount(1);
  await expect(solution.getByText(SOLUTION)).toBeVisible();
  await expect(solution.getByText("Hypothesis")).toBeVisible();

  await activate(
    precision.getByRole("button", { exact: true, name: "Accept" })
  );
  await expect(precision.getByText("Accepted")).toBeVisible();
  await activate(solution.getByRole("button", { name: "Reject" }));
  await expect(solution.getByText("Rejected")).toBeVisible();
}

async function handOffNewRevision(page: Page, activate: Activate) {
  await activate(page.getByRole("button", { name: "Open the intention" }));
  await activate(
    page.getByRole("button", { exact: true, name: PROPOSAL_CALLOUT })
  );
  await expect(page.getByText(PRECISION).first()).toBeVisible();
  await activate(page.getByRole("button", { name: PREPARE_ONE_BRIEF }));
  await expect(page.getByText(CHANGED_SINCE_FIRST_BRIEF)).toBeVisible();
  await expect(
    page.locator("summary", { hasText: PROPOSAL_NEED })
  ).toContainText("· Copied");
  await activate(page.getByRole("button", { name: "Build brief" }));
  const brief = page.getByRole("textbox", { exact: true, name: "Brief" });
  await expect(brief).toHaveValue(SECOND_REVISION_OUTCOME);
  await expect(brief).toHaveValue(PRECISION_IN_BRIEF);
  await expect(brief).not.toHaveValue(SOLUTION_IN_BRIEF);
}

async function walkIntentionJourney(page: Page, activate: Activate) {
  const board = await mockSessionBoard(page);
  await fakeMicrophone(page, "granted");
  await openSessions(page);
  await activate(page.getByRole("button", { name: "Start session" }));
  await recordMarkedPassage(page, activate, board);
  const recordedElements = JSON.stringify(board.state.evidenceVisibleElements);
  expect(recordedElements).toContain('h1 \\"Plans & billing\\"');
  expect(recordedElements).not.toContain("Mark moment");

  await correctPassageContext(page, activate);
  await confirmAndHandOff(page, activate);
  const [intention] = board.state.intentions;
  expect(intention?.decision).toBe("kept");
  expect(intention?.response).toBeNull();

  await continueIntention(page, activate, board);
  await decideProposedChanges(page, activate);
  await handOffNewRevision(page, activate);
  expect(
    board.state.handoffs.map(({ proposals }) => proposals[0]?.revision)
  ).toEqual([2, 1]);
}

test.describe("Reflet sessions in the devtools", () => {
  test.use({ reducedMotion: "reduce", viewport: { height: 900, width: 1440 } });

  test("records, pauses without collecting, then hands off a confirmed intention", async ({
    page,
  }) => {
    const board = await mockSessionBoard(page);
    await fakeMicrophone(page, "granted");
    await openSessions(page);
    await startRecording(page);

    await page.getByRole("button", { name: "Pause" }).click();
    await expect(page.locator(RECORDING_BAR)).toContainText(
      "Paused · nothing is recorded"
    );
    await page.getByRole("heading", { name: "Plans & billing" }).click();
    await page.mouse.wheel(0, 400);
    await page.getByRole("button", { name: "Resume" }).click();
    await page.getByRole("button", { name: "Mark moment" }).click();
    await page.getByRole("button", { name: "Finish" }).click();

    await page.getByRole("button", { name: "Confirm" }).click();
    await page.getByRole("button", { name: PREPARE_ONE_BRIEF }).click();
    await page.getByRole("button", { name: "Build brief" }).click();
    await page.getByRole("button", { name: "Copy brief" }).click();
    await expect(page.getByText("Brief copied").first()).toBeVisible();
    expect(await copiedText(page)).toContain(
      "Set aside — do not build:\n- A history of plans"
    );

    const pause = board.state.collectionCalls.find(
      (call) => call.action === "pause"
    );
    const resume = board.state.collectionCalls.find(
      (call) => call.action === "resume"
    );
    expect(pause && resume).toBeTruthy();
    const collectedWhilePaused = board.state.events.filter(
      (event) =>
        pause && resume && event.atMs > pause.atMs && event.atMs < resume.atMs
    );
    expect(collectedWhilePaused).toEqual([]);
  });

  test("continues a confirmed intention and hands off its next revision", async ({
    page,
  }) => {
    await walkIntentionJourney(page, click);
  });

  test("removes one sensitive screenshot from the review", async ({ page }) => {
    const board = await mockSessionBoard(page);
    await fakeMicrophone(page, "granted");
    await openSessions(page);
    await startRecording(page);
    await page.getByRole("button", { name: "Mark moment" }).click();
    await expect.poll(() => firstSession(board).evidence.length).toBe(2);
    await page.getByRole("button", { name: "Finish" }).click();

    await page.getByRole("tab", { name: EVIDENCE_TAB }).click();
    const removeButtons = page.getByRole("button", {
      name: SCREENSHOT_REMOVAL,
    });
    await expect(removeButtons).toHaveCount(2);
    await removeButtons.last().click();
    await expect(page.getByRole("button", { name: "Cancel" })).toBeFocused();
    await page.getByRole("button", { exact: true, name: "Remove" }).click();

    await expect(
      page.locator("li", {
        hasText: "Screenshot missing: Removed from the session.",
      })
    ).toBeFocused();
    await expect(removeButtons).toHaveCount(1);
    expect(firstSession(board).evidence.map(({ status }) => status)).toEqual([
      "available",
      "missing",
    ]);
  });

  test("a blocked microphone starts nothing and offers a typed note", async ({
    page,
  }) => {
    const board = await mockSessionBoard(page);
    await fakeMicrophone(page, "denied");
    await openSessions(page);
    await page.getByRole("button", { name: "Start session" }).click();

    await expect(page.locator(".dt-ses-problem")).toContainText(
      "The microphone is blocked for this site."
    );
    await expect(page.locator(RECORDING_BAR)).toHaveCount(0);
    expect(board.state.starts).toBe(0);
    await page.getByRole("button", { name: "Write a note instead" }).click();
    await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();
  });

  test("a reload stops the recording and never turns the microphone back on", async ({
    page,
  }) => {
    await mockSessionBoard(page);
    await fakeMicrophone(page, "granted");
    await openSessions(page);
    await startRecording(page);

    await page.reload();
    await page
      .getByRole("toolbar", { name: "Reflet devtools" })
      .getByRole("button", { name: "Sessions" })
      .click();

    await expect(page.getByText(STOPPED_BY_RELOAD)).toBeVisible();
    await expect(page.locator(RECORDING_BAR)).toHaveCount(0);
    expect(await microphoneCalls(page)).toBe(0);
  });
});

test.describe("Reflet sessions on a phone-sized window", () => {
  test.use({ reducedMotion: "reduce", viewport: { height: 780, width: 390 } });

  test("opens from the keyboard with focus inside the panel", async ({
    page,
  }) => {
    await mockSessionBoard(page);
    await fakeMicrophone(page, "granted");
    await page.goto("/sdk-demo");
    await page
      .getByRole("toolbar", { name: "Reflet devtools" })
      .getByRole("button", { name: "Sessions" })
      .focus();
    await page.keyboard.press("Enter");

    await expect(page.getByRole("tab", { name: "Sessions" })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("button", { name: "Start session" })
    ).toBeVisible();
  });

  test("continues an intention end to end from the keyboard", async ({
    page,
  }) => {
    await walkIntentionJourney(page, pressEnter);
  });
});
