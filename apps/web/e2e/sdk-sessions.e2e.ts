import { expect, type Page, test } from "@playwright/test";
import {
  copiedText,
  fakeMicrophone,
  microphoneCalls,
  mockSessionBoard,
} from "./sdk/session-board";

const RECORDING_BAR = "[aria-label='Session recording']";
const STOPPED_BY_RELOAD = /stopped when the page reloaded/;
const SCREENSHOT_REMOVAL = /^Remove screenshot at/;

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

test.describe("Reflet sessions in the devtools", () => {
  test.use({ reducedMotion: "reduce", viewport: { height: 900, width: 1440 } });

  test("records, pauses without collecting, then hands off a kept proposal", async ({
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

    await page.getByRole("button", { name: "Keep" }).click();
    await page.getByRole("button", { name: "Hand off 1 kept" }).click();
    await page.getByRole("button", { name: "Prepare brief" }).click();
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

  test("removes one sensitive screenshot from the review", async ({ page }) => {
    const board = await mockSessionBoard(page);
    await fakeMicrophone(page, "granted");
    await openSessions(page);
    await startRecording(page);
    await page.getByRole("button", { name: "Mark moment" }).click();
    await expect.poll(() => board.state.evidence.length).toBe(2);
    await page.getByRole("button", { name: "Finish" }).click();

    await page.getByRole("button", { name: "Evidence (2)" }).click();
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
    expect(board.state.evidence.map(({ status }) => status)).toEqual([
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
});
