/// <reference types="vite/client" />
import { Readable } from "node:stream";
import { afterEach, describe, expect, test, vi } from "vitest";
import { api, internal } from "../../_generated/api";
import { seedOrganization } from "../../test.fixtures";
import { setupTest } from "../../test.helpers";

const ADMIN = { _id: "user_admin", email: "admin@example.com" };
const dns = vi.hoisted(() => ({ lookup: vi.fn() }));
const https = vi.hoisted(() => ({ request: vi.fn() }));

vi.mock("node:dns/promises", () => dns);
vi.mock("node:https", () => https);

const setup = async () => {
  const t = setupTest({ authUsers: [ADMIN] });
  const organizationId = await t.run(async (ctx) => {
    const orgId = await seedOrganization(ctx);
    await ctx.db.insert("organizationMembers", {
      createdAt: Date.now(),
      organizationId: orgId,
      role: "owner",
      userId: ADMIN._id,
    });
    return orgId;
  });
  const admin = t.withIdentity({ sessionId: ADMIN._id, subject: ADMIN._id });
  return { admin, organizationId, t };
};

/** DNS answers with `resolvedAddress`; the page itself returns `html`. */
const stubInternet = (resolvedAddress: string, html: string) => {
  dns.lookup.mockResolvedValue([{ address: resolvedAddress, family: 4 }]);
  https.request.mockImplementation(
    (_url: URL, _options: unknown, onResponse: (page: Readable) => void) => ({
      end: () =>
        onResponse(
          Object.assign(Readable.from([Buffer.from(html)]), {
            headers: {},
            statusCode: 200,
          })
        ),
      on: vi.fn(),
    })
  );
  return { pageRequests: () => https.request.mock.calls };
};

describe("website references", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  test.each([
    "http://169.254.169.254/latest/meta-data/iam/security-credentials/",
    "http://localhost:3210/api",
    "http://backend:3210/",
  ])("rejects %s", async (url) => {
    const { admin, organizationId } = await setup();

    await expect(
      admin.mutation(api.integrations.website_references.create, {
        organizationId,
        url,
      })
    ).rejects.toThrow(/public/);
  });

  test("scrapes a public page", async () => {
    const { admin, organizationId, t } = await setup();
    stubInternet("93.184.216.34", "<title>Docs</title><p>Hello</p>");
    const referenceId = await admin.mutation(
      api.integrations.website_references.create,
      { organizationId, url: "https://docs.example.com/" }
    );

    await t.action(
      internal.integrations.website_reference_scrape.scrapeWebsite,
      {
        referenceId,
      }
    );

    const reference = await t.run((ctx) => ctx.db.get(referenceId));
    expect(reference).toMatchObject({ status: "success", title: "Docs" });
  });

  test("does not fetch a host that resolves to a private address", async () => {
    const { admin, organizationId, t } = await setup();
    const { pageRequests } = stubInternet("10.0.0.7", "internal secrets");
    const referenceId = await admin.mutation(
      api.integrations.website_references.create,
      { organizationId, url: "https://rebind.example.com/" }
    );

    await t.action(
      internal.integrations.website_reference_scrape.scrapeWebsite,
      {
        referenceId,
      }
    );

    const reference = await t.run((ctx) => ctx.db.get(referenceId));
    expect(pageRequests()).toEqual([]);
    expect(reference).toMatchObject({
      errorMessage: "URL must point to a public address",
      status: "error",
    });
    expect(reference?.scrapedContent).toBeUndefined();
  });
});
