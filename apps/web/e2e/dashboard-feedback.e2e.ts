import { expect, type Page, test } from "@playwright/test";
import { z } from "zod";
import { makeTestUser, signUpAndLandOnDashboard } from "./helpers/auth";

const REPORT_MESSAGE = "The GitHub sync button needs a loading indicator.";

test("the dashboard opens Reflet feedback with a screenshot and resumes the draft", async ({
  page,
}, testInfo) => {
  await page.addInitScript(() =>
    localStorage.setItem("cookie-consent", "rejected")
  );
  const user = makeTestUser("reflet-dogfood");
  await signUpAndLandOnDashboard(page, user);
  const trigger = page.getByRole("button", { name: "Send feedback to Reflet" });
  await expect(trigger).toHaveCount(1);
  await trigger.click();
  await expect(page.locator(".screenshot-preview")).toBeVisible({
    timeout: 20_000,
  });
  const message = page.getByRole("textbox", {
    name: "What would you like to share?",
  });
  await message.fill(REPORT_MESSAGE);
  await page.screenshot({
    animations: "disabled",
    path: testInfo.outputPath("reflet-feedback.png"),
  });
  await page.getByRole("button", { name: "Minimize feedback" }).click();
  await expect(message).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await expect(page.locator(".launcher")).toHaveCount(0);
  await trigger.click();
  await expect(message).toHaveValue(REPORT_MESSAGE);
  await expect(page.locator(".screenshot-preview")).toBeVisible();
  await expectFailedReport(page, user.email);
});

async function expectFailedReport(page: Page, email: string) {
  await page.route("**/api/v1/feedback/create", (route) =>
    route.fulfill({
      body: JSON.stringify({ error: "Feedback service unavailable" }),
      contentType: "application/json",
      status: 503,
    })
  );
  const pendingRequest = page.waitForRequest("**/api/v1/feedback/create");
  await page
    .getByRole("button", { exact: true, name: "Send feedback" })
    .click();
  const request = await pendingRequest;
  expect(request.headers().authorization).toBe(
    "Bearer fb_pub_suvdslc95ykmpl5uhfbqfszq"
  );
  const token = request.headers()["x-user-token"]?.split(".")[1];
  if (!token) {
    throw new Error("Reporter identity missing");
  }
  const identity = z
    .object({ email: z.string() })
    .parse(JSON.parse(Buffer.from(token, "base64url").toString()));
  expect(identity.email).toBe(email);
  const report = z
    .object({ context: z.object({ url: z.string() }) })
    .parse(JSON.parse(request.postData() ?? "null"));
  expect(report.context.url).toBe(page.url());
  await expect(page.getByText("Feedback service unavailable")).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "What would you like to share?" })
  ).toHaveValue(REPORT_MESSAGE);
}
