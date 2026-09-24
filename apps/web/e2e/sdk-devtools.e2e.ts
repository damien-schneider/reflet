import { expect, test } from "@playwright/test";

const DEMO_SOURCE = "apps/web/src/features/sdk-demo/sdk-demo.tsx";
const PICK_BUTTON = /Pick an element/;
const FIRST_PIN = /^Note 1:/;
const MOVE_PANEL = /Move panel/;
const MOVE_BUTTON = /Move devtools/;

test.describe("Reflet devtools under next dev", () => {
  test.use({ reducedMotion: "reduce", viewport: { height: 900, width: 1440 } });

  test("Shift+click opens the source file with the picked JSX marked", async ({
    page,
  }) => {
    await page.goto("/sdk-demo");
    await page.getByRole("button", { name: PICK_BUTTON }).click();
    await page
      .getByRole("heading", { name: "Plans & billing" })
      .click({ modifiers: ["Shift"] });

    await expect(page.locator(".dt-code-path")).toContainText(DEMO_SOURCE);
    await expect(
      page.locator('.dt-line[data-marked="true"]').first()
    ).toContainText("<h1");
    await expect(
      page.getByRole("link", { name: "Open in editor" })
    ).toHaveAttribute("href", new RegExp(`${DEMO_SOURCE}:\\d+:\\d+$`));
  });

  test("the note card opens the code without saving a note", async ({
    page,
  }) => {
    await page.goto("/sdk-demo");
    await page.getByRole("button", { name: PICK_BUTTON }).click();
    await page.getByRole("heading", { name: "Plans & billing" }).click();
    await page.getByRole("button", { name: "View code" }).click();

    await expect(page.locator(".dt-code-path")).toContainText(DEMO_SOURCE);
    await expect(page.locator(".dt-count")).toHaveCount(0);
  });

  test("opens the panel full height and resizes it by its edges", async ({
    page,
  }) => {
    await page.goto("/sdk-demo");
    await page.getByRole("button", { name: "Dev notes" }).click();
    const sheet = page.getByRole("complementary", { name: "Reflet devtools" });
    await expect(sheet).toBeVisible();
    const viewport = page.viewportSize();
    const opened = await sheet.boundingBox();
    if (!(opened && viewport)) {
      throw new Error("Devtools panel missing");
    }
    expect(opened.height).toBeGreaterThan(viewport.height - 30);

    const dragBy = async (name: string, dx: number, dy: number) => {
      const handle = await page.getByRole("button", { name }).boundingBox();
      if (!handle) {
        throw new Error(`${name} missing`);
      }
      const x = handle.x + handle.width / 2;
      const y = handle.y + handle.height / 2;
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x + dx, y + dy, { steps: 6 });
      await page.mouse.up();
    };

    await dragBy("Resize panel width (double-click to reset)", -120, 0);
    await dragBy("Resize panel height (double-click for full height)", 0, -300);
    const resized = await sheet.boundingBox();
    expect(Math.round(resized?.width ?? 0)).toBe(
      Math.round(opened.width + 120)
    );
    expect(Math.round(resized?.height ?? 0)).toBe(
      Math.round(opened.height - 300)
    );

    await page.reload();
    await page.getByRole("button", { name: "Dev notes" }).click();
    await expect
      .poll(async () => Math.round((await sheet.boundingBox())?.height ?? 0))
      .toBe(Math.round(opened.height - 300));

    await page
      .getByRole("button", {
        name: "Resize panel height (double-click for full height)",
      })
      .dblclick();
    await expect
      .poll(async () => Math.round((await sheet.boundingBox())?.height ?? 0))
      .toBe(Math.round(opened.height));
  });

  test("drags the toolbar, keeps it there across reloads, and resets on double-click", async ({
    page,
  }) => {
    await page.goto("/sdk-demo");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    const bar = page.getByRole("toolbar", { name: "Reflet devtools" });
    const grip = page.getByRole("button", { name: MOVE_BUTTON });
    const start = await bar.boundingBox();
    const handle = await grip.boundingBox();
    if (!(start && handle)) {
      throw new Error("Devtools toolbar missing");
    }

    await page.mouse.move(handle.x + 5, handle.y + 5);
    await page.mouse.down();
    await page.mouse.move(400, 300, { steps: 8 });
    await page.mouse.up();
    const moved = await bar.boundingBox();
    expect(Math.abs((moved?.y ?? 0) - start.y)).toBeGreaterThan(200);

    await page.reload();
    await expect
      .poll(async () => Math.round((await bar.boundingBox())?.y ?? 0))
      .toBe(Math.round(moved?.y ?? 0));

    await grip.dblclick();
    await expect
      .poll(async () => Math.round((await bar.boundingBox())?.y ?? 0))
      .toBe(Math.round(start.y));
  });

  test("a note pins at once, and a reload mid-lookup still ends with its source", async ({
    page,
  }) => {
    let releaseSource: () => void = () => undefined;
    const sourceHeld = new Promise<void>((resolve) => {
      releaseSource = resolve;
    });
    await page.route("**/api/reflet-devtools/source**", async (route) => {
      await sourceHeld;
      await route.continue();
    });
    await page.goto("/sdk-demo");
    await page.getByRole("button", { name: PICK_BUTTON }).click();
    await page.getByRole("button", { name: "Manage plan" }).click();
    await page
      .getByRole("textbox", { name: "Dev note" })
      .fill("Say where this button leads");
    await page.keyboard.press("Enter");

    const pin = page.getByRole("button", { name: FIRST_PIN });
    await expect(pin).toHaveText("1");
    await expect(pin).toHaveAttribute("data-locating", "true");
    await expect(
      page.getByRole("complementary", { name: "Reflet devtools" })
    ).toHaveCount(0);

    await page.unroute("**/api/reflet-devtools/source**");
    releaseSource();
    await page.reload();
    await expect(page.getByRole("button", { name: FIRST_PIN })).toHaveAttribute(
      "data-locating",
      "false"
    );
    await page.getByRole("button", { name: FIRST_PIN }).click();
    const popover = page.getByRole("dialog", { name: "Note 1" });
    await expect(popover.locator(".dt-note-text")).toHaveText(
      "Say where this button leads"
    );
    await expect(popover.locator(".dt-source")).toContainText(DEMO_SOURCE);
    await page.keyboard.press("Escape");
    await expect(popover).toHaveCount(0);

    await page.getByRole("button", { name: "Dev notes" }).click();
    await expect(page.locator(".dt-card .dt-pin-badge")).toHaveText("1");
  });

  test("clears notes into a one-day archive that can be restored", async ({
    page,
  }) => {
    await page.goto("/sdk-demo");
    await page.getByRole("button", { name: PICK_BUTTON }).click();
    await page.getByRole("heading", { name: "Plans & billing" }).click();
    await page.getByRole("textbox", { name: "Dev note" }).fill("Keep me");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("button", { name: FIRST_PIN })).toBeVisible();

    await page.getByRole("button", { name: "Dev notes" }).click();
    await page.getByRole("button", { name: "Clear notes" }).click();
    await expect(page.getByRole("button", { name: FIRST_PIN })).toHaveCount(0);
    await expect(page.locator(".dt-archived")).toContainText("1 cleared note");

    await page.getByRole("button", { name: "Restore" }).click();
    await expect(page.getByRole("button", { name: FIRST_PIN })).toBeVisible();

    await page.getByRole("button", { name: "Clear notes" }).click();
    await page.evaluate(async () => {
      const database = await new Promise<IDBDatabase>((resolve) => {
        const request = indexedDB.open("reflet-devtools");
        request.onsuccess = () => resolve(request.result);
      });
      const store = database
        .transaction("notes", "readwrite")
        .objectStore("notes");
      await new Promise<void>((resolve) => {
        const all = store.getAll();
        all.onsuccess = () => {
          for (const note of all.result) {
            store.put({
              ...note,
              archivedAt: Date.now() - 25 * 60 * 60 * 1000,
            });
          }
          resolve();
        };
      });
    });
    await page.reload();
    await page.getByRole("button", { name: "Dev notes" }).click();
    await expect(page.getByText("No notes yet.")).toBeVisible();
    await expect(page.locator(".dt-archived")).toHaveCount(0);
  });

  test("reports a failed send and retries it without filing twice", async ({
    page,
  }) => {
    let createCalls = 0;
    let boardIsDown = true;
    await page.route("**/api/reflet-devtools/status", (route) =>
      route.fulfill({
        json: {
          editor: "vscode",
          hasSecretKey: true,
          marker: "reflet-devtools",
        },
      })
    );
    await page.route("**/proxy/api/v1/feedback/create", (route) => {
      createCalls++;
      return boardIsDown
        ? route.fulfill({ json: { error: "Board is down" }, status: 500 })
        : route.fulfill({ json: { feedbackId: "fb_1", isApproved: false } });
    });
    await page.route("**/proxy/api/v1/feedback/screenshot/**", (route) =>
      route.fulfill({ json: { screenshotId: "s", uploadUrl: "/nowhere" } })
    );
    await page.goto("/sdk-demo");
    await page.getByRole("button", { name: PICK_BUTTON }).click();
    await page.getByRole("heading", { name: "Plans & billing" }).click();
    await page.getByRole("textbox", { name: "Dev note" }).fill("Rename this");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("button", { name: FIRST_PIN })).toHaveAttribute(
      "data-locating",
      "false"
    );

    await page.getByRole("button", { name: "Dev notes" }).click();
    await page.getByRole("button", { name: "Send 1 to board" }).click();
    const notice = page.locator(".dt-notice");
    await expect(notice).toContainText('"Rename this" was not sent');
    await expect(notice).toContainText("Board is down");
    await expect(page.locator(".dt-chip")).toHaveCount(0);

    boardIsDown = false;
    await notice.getByRole("button", { name: "Retry" }).click();
    await expect(page.locator(".dt-chip")).toHaveText("On the board");
    expect(createCalls).toBe(2);
  });

  test("moves the panel by its header, fits smaller windows, and returns when the window grows", async ({
    page,
  }) => {
    await page.goto("/sdk-demo");
    await page.getByRole("button", { name: "Dev notes" }).click();
    const sheet = page.getByRole("complementary", { name: "Reflet devtools" });
    const bar = page.getByRole("toolbar", { name: "Reflet devtools" });
    const docked = await sheet.boundingBox();
    const header = await page
      .getByRole("button", { name: MOVE_PANEL })
      .boundingBox();
    if (!(docked && header)) {
      throw new Error("Devtools panel missing");
    }
    await expect(bar).toBeVisible();
    const barBox = await bar.boundingBox();
    expect((barBox?.x ?? 0) + (barBox?.width ?? 0)).toBeLessThanOrEqual(
      docked.x
    );

    await page.mouse.move(header.x + header.width - 60, header.y + 10);
    await page.mouse.down();
    await page.mouse.move(header.x + header.width - 460, header.y + 10, {
      steps: 8,
    });
    await page.mouse.up();
    const movedX = Math.round(docked.x - 400);
    await expect
      .poll(async () => Math.round((await sheet.boundingBox())?.x ?? 0))
      .toBe(movedX);

    await page.setViewportSize({ height: 700, width: 900 });
    await expect
      .poll(async () => {
        const box = await sheet.boundingBox();
        return Boolean(box && box.x >= 0 && box.x + box.width <= 900);
      })
      .toBe(true);
    expect(Math.round((await sheet.boundingBox())?.height ?? 0)).toBe(676);

    await page.setViewportSize({ height: 900, width: 1440 });
    await expect
      .poll(async () => Math.round((await sheet.boundingBox())?.x ?? 0))
      .toBe(movedX);

    await page.getByRole("button", { name: MOVE_PANEL }).dblclick();
    await expect
      .poll(async () => Math.round((await sheet.boundingBox())?.x ?? 0))
      .toBe(Math.round(docked.x));
  });
});
