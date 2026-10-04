import { expect, type Page, test } from "@playwright/test";
import { z } from "zod";
import {
  createOrganization,
  makeOrgName,
  makeTestUser,
  signUpAndLandOnDashboard,
} from "../helpers/auth";

const CONVEX_SOCKET = /\/api\/[^/]+\/sync(?:\?|$)/;
const ORGANIZATION_SWITCHER = /^Switch organization/;

const queryMessage = z.looseObject({
  modifications: z
    .array(z.looseObject({ udfPath: z.string().optional() }))
    .optional(),
  type: z.string(),
});

async function failQuery(page: Page, udfPath: string) {
  await page.routeWebSocket(CONVEX_SOCKET, (socket) => {
    const backend = socket.connectToServer();
    socket.onMessage((raw) => {
      if (typeof raw !== "string") {
        backend.send(raw);
        return;
      }
      const message = queryMessage.parse(JSON.parse(raw));
      if (message.type !== "ModifyQuerySet") {
        backend.send(raw);
        return;
      }
      backend.send(
        JSON.stringify({
          ...message,
          modifications: message.modifications?.map((modification) => ({
            ...modification,
            ...(modification.udfPath === udfPath && {
              udfPath: "test/missing:query",
            }),
          })),
        })
      );
    });
  });
}

async function openFailingInbox(page: Page, query: string) {
  await signUpAndLandOnDashboard(page, makeTestUser("dashboard-error"));
  const slug = await createOrganization(page, makeOrgName("Error recovery"));
  await failQuery(page, query);
  await page.goto(`/dashboard/${slug}/inbox`);
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "This page didn’t load"
  );
  return slug;
}

test("an inbox query error preserves the workspace sidebar and navigation", async ({
  page,
}) => {
  const slug = await openFailingInbox(page, "support/admin:list");
  const main = page.getByRole("main");
  await expect(main.getByRole("alert")).toBeVisible();
  await expect(
    page.getByRole("button", { name: ORGANIZATION_SWITCHER })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { exact: true, name: "Inbox" })
  ).toBeVisible();
  await page.getByRole("link", { exact: true, name: "Feedback" }).click();
  await expect(page).toHaveURL(`/dashboard/${slug}`);
  await expect(main.getByRole("alert")).not.toBeVisible();
});

test("a dashboard query error keeps a sidebar that opens on mobile", async ({
  page,
}) => {
  await openFailingInbox(page, "organizations/queries:list");
  await expect(page.getByRole("main").getByRole("alert")).toBeVisible();
  const feedback = page.getByRole("link", { exact: true, name: "Feedback" });
  await expect(feedback).toBeVisible();
  await page.screenshot({
    path: test.info().outputPath("dashboard-error.png"),
  });

  await page.setViewportSize({ height: 844, width: 390 });
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(feedback).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390
  );
});
