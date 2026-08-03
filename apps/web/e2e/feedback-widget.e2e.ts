import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import {
  createOrganization,
  makeOrgName,
  makeTestUser,
  signUpAndLandOnDashboard,
} from "./helpers/auth";

const SITE_URL_PATTERN = /^NEXT_PUBLIC_CONVEX_SITE_URL=(.+)$/m;
const PUBLIC_KEY_PATTERN = /^fb_pub_/;
const QUOTES_PATTERN = /^["']|["']$/g;
const NOT_PUBLIC_PATTERN = /not public/;

const ONE_PIXEL_PNG =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

function envFile(): string {
  const candidates = [
    join(process.cwd(), ".env"),
    join(process.cwd(), "apps/web/.env"),
  ];
  const found = candidates.find((path) => existsSync(path));
  if (!found) {
    throw new Error(`No .env found in ${candidates.join(" or ")}`);
  }
  return found;
}

function convexSiteUrl(): string {
  const env = readFileSync(envFile(), "utf8");
  const value = env.match(SITE_URL_PATTERN)?.[1];
  if (!value) {
    throw new Error("NEXT_PUBLIC_CONVEX_SITE_URL missing from apps/web/.env");
  }
  return value.trim().replace(QUOTES_PATTERN, "");
}

function screenshotBlob(): Blob {
  return new Blob([Buffer.from(ONE_PIXEL_PNG, "base64")], {
    type: "image/png",
  });
}

function widgetContext(url: string) {
  return {
    browser: "Chrome 141",
    consoleEvents: [
      {
        level: "error" as const,
        message: "TypeError: cannot read 'total' of undefined",
        timestamp: Date.now(),
      },
    ],
    device: "desktop",
    language: "en-US",
    metadata: { plan: "pro" },
    os: "macOS",
    pageTitle: "Billing — Acme",
    screen: { height: 1080, width: 1920 },
    sdkVersion: "0.2.0",
    selection: {
      componentStack: ["InvoiceRow", "BillingPage"],
      html: '<button id="pay-now" type="button">Pay now</button>',
      label: "button#pay-now",
      rect: { height: 40, width: 120, x: 320, y: 240 },
      selector: "#pay-now",
      sourceLocation: "src/billing/invoice-row.tsx:20:20",
    },
    timezone: "Europe/Paris",
    url,
    userAgent: "Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/141",
    viewport: { devicePixelRatio: 2, height: 800, width: 1280 },
  };
}

async function submitLikeTheWidget(
  publicKey: string,
  title: string,
  url: string
): Promise<string> {
  const { Reflet } = await import("reflet-sdk");
  const client = new Reflet({ baseUrl: convexSiteUrl(), publicKey });

  const { feedbackId } = await client.create({
    context: widgetContext(url),
    description: `[Bug] ${title}\n\nClicking Pay now does nothing.`,
    title,
  });

  const blob = screenshotBlob();
  const { uploadUrl } = await client.getScreenshotUploadUrl();
  const upload = await fetch(uploadUrl, {
    body: blob,
    headers: { "Content-Type": "image/png" },
    method: "POST",
  });
  if (!upload.ok) {
    throw new Error(`Screenshot upload failed (${upload.status})`);
  }
  const { storageId } = await upload.json();

  await client.saveScreenshot({
    annotations: [
      {
        color: "#ef4444",
        height: 60,
        type: "rectangle",
        width: 120,
        x: 40,
        y: 30,
      },
    ],
    feedbackId,
    filename: "screenshot.png",
    height: 1,
    mimeType: "image/png",
    pageUrl: url,
    size: blob.size,
    storageId,
    width: 1,
  });

  return feedbackId;
}

test.describe("Floating feedback widget", () => {
  test("a widget report reaches the dashboard with its context and screenshot", async ({
    page,
  }) => {
    await signUpAndLandOnDashboard(page, makeTestUser("widget"));
    const slug = await createOrganization(page, makeOrgName("Widget Org"));

    await page.goto(`/dashboard/${slug}/project/api-keys`);
    await page
      .getByPlaceholder("API key name (e.g., Production)")
      .fill("Widget e2e");
    await page.getByRole("button", { name: "Generate API Keys" }).click();

    await page.getByRole("tab", { name: "API Keys" }).click();
    const publicKeyField = page.locator("input[readonly]").first();
    await expect(publicKeyField).toHaveValue(PUBLIC_KEY_PATTERN, {
      timeout: 30_000,
    });
    const publicKey = await publicKeyField.inputValue();

    const reportTitle = `Pay now does nothing ${Date.now()}`;
    const reportedUrl = "https://acme.example.com/billing?invoice=1042";
    const feedbackId = await submitLikeTheWidget(
      publicKey,
      reportTitle,
      reportedUrl
    );
    expect(feedbackId).toBeTruthy();

    await page.goto(`/dashboard/${slug}`);
    await page.getByText(reportTitle).first().click();

    const drawer = page.locator('[role="dialog"]').first();
    await expect(drawer.getByText("Report context")).toBeVisible({
      timeout: 30_000,
    });
    await expect(drawer.getByText(reportedUrl)).toBeVisible();
    await expect(drawer.getByText("<InvoiceRow>")).toBeVisible();
    await expect(drawer.getByAltText("screenshot.png")).toBeVisible({
      timeout: 30_000,
    });

    const { Reflet } = await import("reflet-sdk");
    const reader = new Reflet({ baseUrl: convexSiteUrl(), publicKey });
    await expect(reader.list()).rejects.toThrow(NOT_PUBLIC_PATTERN);
  });

  test("the public API answers cross-origin preflight for the widget", async () => {
    const response = await fetch(`${convexSiteUrl()}/api/v1/feedback/create`, {
      headers: {
        "Access-Control-Request-Headers": "content-type,x-reflet-key",
        "Access-Control-Request-Method": "POST",
        Origin: "https://acme.example.com",
      },
      method: "OPTIONS",
    });

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
  });
});
