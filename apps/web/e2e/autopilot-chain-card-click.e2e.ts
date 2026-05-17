import { expect, test } from "@playwright/test";
import {
  createTestEmail,
  createTestName,
  DASHBOARD_ORG_SLUG_REGEX,
  signUpNewUserWithOrg,
} from "./helpers/auth";

const ORG_SLUG_FROM_URL = /\/dashboard\/([^/]+)/;
const CHAIN_HEADING_REGEX = /Document chain/i;
const CARD_BUTTON_REGEX = /— open documents$/i;
const NODRAG_CLASS_REGEX = /\bnodrag\b/;
const NOPAN_CLASS_REGEX = /\bnopan\b/;
const OPEN_DOCS_SUFFIX_REGEX = /\s+— open documents$/i;

/**
 * Regression test for the React Flow card clickability bug. The chain tree
 * renders each chain node inside an `@xyflow/react` custom node. Without
 * `nodrag`/`nopan` on the interactive `<button>` AND `pointerEvents: "all"`
 * on the node style, real-browser clicks get swallowed by RF's drag
 * detection and the preview dialog never opens. jsdom misses this because
 * RF's pointer plumbing is short-circuited; only a real browser reproduces
 * the failure mode.
 */
test.use({ viewport: { width: 1920, height: 1200 } });

test.describe("Autopilot chain — card click opens preview dialog", () => {
  test("clicking a chain node card surfaces the related documents dialog", async ({
    page,
  }) => {
    const user = {
      email: createTestEmail("autopilot-chain-card"),
      password: "password123",
    };
    const orgName = createTestName("Chain Card Org");

    await page.addInitScript(() => {
      try {
        window.localStorage.setItem("cookie-consent", "rejected");
      } catch {
        /* localStorage may be unavailable */
      }
    });

    await page.goto("/dashboard");
    await page.waitForLoadState("domcontentloaded", { timeout: 10_000 });
    await page.waitForSelector("h1", { state: "visible", timeout: 10_000 });

    await signUpNewUserWithOrg(page, user, orgName);
    await page.waitForURL(DASHBOARD_ORG_SLUG_REGEX, { timeout: 20_000 });

    const orgSlug = page.url().match(ORG_SLUG_FROM_URL)?.[1];
    expect(orgSlug, `Expected org slug in ${page.url()}`).toBeTruthy();

    await page.goto(`/dashboard/${orgSlug}/autopilot/chain`);
    await page.waitForLoadState("networkidle", { timeout: 15_000 });

    // Verify the Tree view is actually mounted (default), not the List
    // fallback, so we're exercising the React Flow render path.
    await expect(
      page.getByRole("heading", { level: 2, name: CHAIN_HEADING_REGEX })
    ).toBeVisible({ timeout: 15_000 });

    // Target a CENTRAL chain node (`market_analysis` at col 3) so React
    // Flow's `fitView` always places it well inside the visible container
    // — the leftmost nodes can get clipped when the autopilot layout's
    // `max-w-6xl` shrinks the chain container below the chain's natural
    // width.
    const node = page.locator('.react-flow__node[data-id="market_analysis"]');
    await expect(node).toBeVisible({ timeout: 15_000 });
    const card = node.getByRole("button", { name: CARD_BUTTON_REGEX });
    await expect(card).toBeVisible({ timeout: 15_000 });

    // Sanity-check the React Flow integration contract: the button must
    // carry `nodrag` so RF's pane drag handler ignores the pointerdown.
    // Without it, the click is swallowed by RF's drag-start path.
    await expect(card).toHaveClass(NODRAG_CLASS_REGEX);
    await expect(card).toHaveClass(NOPAN_CLASS_REGEX);

    // Snapshot the card label BEFORE clicking — Radix Dialog sets
    // `aria-hidden` on the background when open, which filters the button
    // out of `getByRole` queries.
    const cardLabel = (await card.getAttribute("aria-label")) ?? "";
    const label = cardLabel.replace(OPEN_DOCS_SUFFIX_REGEX, "").trim();
    expect(label.length, "card aria-label must be set").toBeGreaterThan(0);

    // The actual regression — clicking the card MUST open the documents
    // dialog with the matching content. We fire a real pointer sequence
    // via mouse.move + mouse.down/up at the button's bounding-box centre
    // so React Flow's drag listener observes the same events a user would
    // dispatch. If `nodrag` is missing or RF's drag listener cancels the
    // click, the dialog never opens.
    await card.scrollIntoViewIfNeeded();
    // Real-browser click via Playwright's full pointer pipeline. `force:
    // true` skips the "obscured by" actionability check (the autopilot
    // page layout flex container reports as the top element at the
    // button's centre when React Flow's CSS transform is in play, but the
    // button still receives the native click).
    await card.click({ force: true });

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    await expect(dialog).toContainText(label);
  });

  test("the card carries a non-grab cursor so users perceive it as clickable", async ({
    page,
  }) => {
    const user = {
      email: createTestEmail("autopilot-chain-cursor"),
      password: "password123",
    };
    const orgName = createTestName("Chain Cursor Org");

    await page.addInitScript(() => {
      try {
        window.localStorage.setItem("cookie-consent", "rejected");
      } catch {
        /* localStorage may be unavailable */
      }
    });

    await page.goto("/dashboard");
    await page.waitForLoadState("domcontentloaded", { timeout: 10_000 });
    await page.waitForSelector("h1", { state: "visible", timeout: 10_000 });

    await signUpNewUserWithOrg(page, user, orgName);
    await page.waitForURL(DASHBOARD_ORG_SLUG_REGEX, { timeout: 20_000 });

    const orgSlug = page.url().match(ORG_SLUG_FROM_URL)?.[1];
    await page.goto(`/dashboard/${orgSlug}/autopilot/chain`);
    await page.waitForLoadState("networkidle", { timeout: 15_000 });

    const node = page.locator('.react-flow__node[data-id="market_analysis"]');
    await expect(node).toBeVisible({ timeout: 15_000 });
    const card = node.getByRole("button", { name: CARD_BUTTON_REGEX });
    await expect(card).toBeVisible({ timeout: 15_000 });

    // The resolved cursor must NOT be `grab` (RF default for
    // `.react-flow__node`). We assert on the button itself because that's
    // the surface the user actually points at. `cursor-pointer` is set
    // unconditionally on the button, so no hover is needed.
    const cursor = await card.evaluate(
      (el) => window.getComputedStyle(el).cursor
    );
    expect(cursor).not.toBe("grab");
    expect(cursor).not.toBe("grabbing");
    expect(["pointer", "auto", "default"]).toContain(cursor);

    // Also assert that the parent `.react-flow__node` doesn't fall back to
    // grab — that's the surface that catches pointer events around the
    // card's padding.
    const nodeCursor = await node.evaluate(
      (el) => window.getComputedStyle(el).cursor
    );
    expect(nodeCursor).not.toBe("grab");
    expect(nodeCursor).not.toBe("grabbing");
  });
});
