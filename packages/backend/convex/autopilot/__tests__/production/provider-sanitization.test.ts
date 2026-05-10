/// <reference types="vite/client" />

import { describe, expect, test } from "vitest";
import { internal } from "../../../_generated/api";
import type { Id } from "../../../_generated/dataModel";
import { fetchContentWithExa, searchWithExa } from "../../agents/shared_exa";
import {
  createAutopilotConfig,
  createOrg,
  createTestContext,
  getActivity,
  type TestContext,
} from "../test-fixtures.helpers";

const providerErrorBody =
  '{"message":"Bad credentials","token":"provider_secret_token","email":"customer@example.com"}';

function restoreEnvValue(
  name:
    | "BUFFER_ACCESS_TOKEN"
    | "EXA_API_KEY"
    | "RESEND_API_KEY"
    | "TYPEFULLY_API_KEY",
  value: string | undefined
) {
  if (value === undefined) {
    delete process.env[name];
    return;
  }
  process.env[name] = value;
}

async function enableSalesOutreach(
  t: TestContext,
  organizationId: Id<"organizations">
) {
  const configId = await createAutopilotConfig(t, organizationId);
  await t.run((ctx) =>
    ctx.db.patch(configId, {
      orgEmailAddress: "sales@reflet.example",
      salesEnabled: true,
    })
  );
}

async function enableGrowthPublishing(
  t: TestContext,
  organizationId: Id<"organizations">
) {
  const configId = await createAutopilotConfig(t, organizationId);
  await t.run((ctx) =>
    ctx.db.patch(configId, {
      growthEnabled: true,
    })
  );
}

async function createLead(t: TestContext, organizationId: Id<"organizations">) {
  const now = Date.now();
  return await t.run((ctx) =>
    ctx.db.insert("autopilotLeads", {
      organizationId,
      name: "Prospect",
      email: "prospect@example.com",
      source: "manual",
      status: "discovered",
      outreachCount: 0,
      createdAt: now,
      updatedAt: now,
    })
  );
}

async function createApprovedEmail(
  t: TestContext,
  organizationId: Id<"organizations">,
  linkedLeadId: Id<"autopilotLeads">
) {
  const now = Date.now();
  return await t.run((ctx) =>
    ctx.db.insert("autopilotDocuments", {
      organizationId,
      type: "email",
      title: "Approved outreach",
      content: "Hello",
      tags: [],
      status: "published",
      needsReview: false,
      linkedLeadId,
      createdAt: now,
      updatedAt: now,
    })
  );
}

async function createApprovedSocialContent(
  t: TestContext,
  organizationId: Id<"organizations">
) {
  const now = Date.now();
  return await t.run((ctx) =>
    ctx.db.insert("autopilotDocuments", {
      organizationId,
      type: "twitter_post",
      title: "Approved social post",
      content: "Launch update",
      tags: [],
      sourceAgent: "growth",
      status: "published",
      needsReview: false,
      createdAt: now,
      updatedAt: now,
    })
  );
}

function expectProviderBodyHidden(message: string) {
  expect(message).toContain("HTTP 401");
  expect(message).not.toContain("provider_secret_token");
  expect(message).not.toContain("Bad credentials");
  expect(message).not.toContain("customer@example.com");
}

async function expectRejectedProviderBodyHidden(
  operation: () => Promise<unknown>
) {
  let message = "";
  try {
    await operation();
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
  }

  expect(message).toContain("HTTP 401");
  expectProviderBodyHidden(message);
}

describe("autopilot provider error sanitization", () => {
  test("Exa failures do not expose provider response bodies", async () => {
    const originalFetch = globalThis.fetch;
    const originalExaKey = process.env.EXA_API_KEY;
    const failingFetch: typeof fetch = async () =>
      new Response(providerErrorBody, {
        status: 401,
        statusText: "Unauthorized",
      });
    globalThis.fetch = failingFetch;
    process.env.EXA_API_KEY = "exa_test_key";

    try {
      await expectRejectedProviderBodyHidden(() =>
        searchWithExa({ query: "production readiness" })
      );
      await expectRejectedProviderBodyHidden(() =>
        fetchContentWithExa(["https://example.com"])
      );
    } finally {
      globalThis.fetch = originalFetch;
      restoreEnvValue("EXA_API_KEY", originalExaKey);
    }
  });

  test("outreach email failures do not log provider response bodies", async () => {
    const t = createTestContext();
    const organizationId = await createOrg(t);
    await enableSalesOutreach(t, organizationId);
    const leadId = await createLead(t, organizationId);
    await createApprovedEmail(t, organizationId, leadId);
    const originalFetch = globalThis.fetch;
    const originalResendKey = process.env.RESEND_API_KEY;
    const failingFetch: typeof fetch = async () =>
      new Response(providerErrorBody, {
        status: 401,
        statusText: "Unauthorized",
      });
    globalThis.fetch = failingFetch;
    process.env.RESEND_API_KEY = "resend_test_key";

    try {
      await t.action(
        internal.autopilot.integrations.email.sendApprovedOutreach,
        { organizationId }
      );
    } finally {
      globalThis.fetch = originalFetch;
      restoreEnvValue("RESEND_API_KEY", originalResendKey);
    }

    const activity = await getActivity(t);
    const failure = activity.find((entry) =>
      entry.message.startsWith("Failed to send email")
    );
    expect(failure).toBeDefined();
    expectProviderBodyHidden(failure?.message ?? "");
  });

  test("social publishing failures do not log provider response bodies", async () => {
    const t = createTestContext();
    const organizationId = await createOrg(t);
    await enableGrowthPublishing(t, organizationId);
    await createApprovedSocialContent(t, organizationId);
    const originalFetch = globalThis.fetch;
    const originalBufferToken = process.env.BUFFER_ACCESS_TOKEN;
    const originalTypefullyKey = process.env.TYPEFULLY_API_KEY;
    const failingFetch: typeof fetch = async () =>
      new Response(providerErrorBody, {
        status: 401,
        statusText: "Unauthorized",
      });
    globalThis.fetch = failingFetch;
    process.env.BUFFER_ACCESS_TOKEN = undefined;
    process.env.TYPEFULLY_API_KEY = "typefully_test_key";

    try {
      await t.action(
        internal.autopilot.integrations.social.publishApprovedContent,
        { organizationId }
      );
    } finally {
      globalThis.fetch = originalFetch;
      restoreEnvValue("BUFFER_ACCESS_TOKEN", originalBufferToken);
      restoreEnvValue("TYPEFULLY_API_KEY", originalTypefullyKey);
    }

    const activity = await getActivity(t);
    const failure = activity.find((entry) =>
      entry.message.startsWith("Failed to publish")
    );
    expect(failure).toBeDefined();
    expectProviderBodyHidden(failure?.message ?? "");
  });
});
