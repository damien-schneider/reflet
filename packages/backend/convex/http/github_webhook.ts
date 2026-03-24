import type { httpRouter } from "convex/server";
import { z } from "zod";
import { internal } from "../_generated/api";
import { httpAction } from "../_generated/server";

type Router = ReturnType<typeof httpRouter>;

// ============================================
// ZOD SCHEMAS
// ============================================

const webhookInstallationSchema = z.object({ id: z.number() });

const releasePayloadSchema = z.object({
  release: z.object({
    id: z.number(),
    tag_name: z.string(),
    name: z.string().nullable(),
    body: z.string().nullable(),
    html_url: z.string(),
    draft: z.boolean(),
    prerelease: z.boolean(),
    published_at: z.string().nullable(),
    created_at: z.string(),
  }),
  action: z.string(),
  installation: webhookInstallationSchema,
});

const issuePayloadSchema = z.object({
  issue: z.object({
    id: z.number(),
    number: z.number(),
    title: z.string(),
    body: z.string().nullable(),
    html_url: z.string(),
    state: z.enum(["open", "closed"]),
    labels: z.array(z.object({ name: z.string() })),
    user: z.object({ login: z.string(), avatar_url: z.string() }).nullable(),
    milestone: z.object({ title: z.string() }).nullable(),
    assignees: z.array(z.object({ login: z.string() })),
    created_at: z.string(),
    updated_at: z.string(),
    closed_at: z.string().nullable(),
  }),
  action: z.string(),
  installation: webhookInstallationSchema,
});

const pullRequestPayloadSchema = z.object({
  pull_request: z.object({
    id: z.number(),
    number: z.number(),
    title: z.string(),
    body: z.string().nullable(),
    html_url: z.string(),
    state: z.enum(["open", "closed"]),
    merged: z.boolean(),
    merged_at: z.string().nullable(),
    user: z.object({ login: z.string(), avatar_url: z.string() }).nullable(),
    head: z.object({ ref: z.string(), sha: z.string() }),
    base: z.object({ ref: z.string() }),
  }),
  action: z.string(),
  installation: webhookInstallationSchema,
});

// ============================================
// HELPERS
// ============================================

type WebhookCtx = Parameters<Parameters<typeof httpAction>[0]>[0];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function webhookJson(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function verifyWebhookSignature(
  body: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signed = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const hexDigest = Array.from(new Uint8Array(signed))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const expected = `sha256=${hexDigest}`;

  // Constant-time comparison via double-HMAC: avoids bitwise operators
  // while preventing timing attacks on the string comparison
  const verifyKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode("verify"),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const [hmacExpected, hmacActual] = await Promise.all([
    crypto.subtle.sign("HMAC", verifyKey, encoder.encode(expected)),
    crypto.subtle.sign("HMAC", verifyKey, encoder.encode(signature)),
  ]);

  const a = new Uint8Array(hmacExpected);
  const b = new Uint8Array(hmacActual);
  return a.length === b.length && a.every((val, i) => val === b[i]);
}

// ============================================
// WEBHOOK HANDLERS
// ============================================

async function handleInstallationWebhook(
  ctx: WebhookCtx,
  payload: Record<string, unknown>
): Promise<Response | null> {
  if (typeof payload.action !== "string" || payload.action !== "deleted") {
    return null;
  }
  const installation = webhookInstallationSchema.parse(payload.installation);
  await ctx.runMutation(
    internal.integrations.github.mutations.handleInstallationDeleted,
    {
      installationId: String(installation.id),
    }
  );
  return webhookJson({ success: true, action: "installation_deleted" });
}

async function handleReleaseWebhook(
  ctx: WebhookCtx,
  payload: Record<string, unknown>
): Promise<Response> {
  const { release, action, installation } = releasePayloadSchema.parse(payload);
  const installationId = String(installation.id);

  const connection = await ctx.runQuery(
    internal.integrations.github.queries.getConnectionByInstallation,
    { installationId }
  );

  if (connection) {
    await ctx.runMutation(
      internal.integrations.github.actions.processReleaseWebhook,
      {
        connectionId: connection._id,
        organizationId: connection.organizationId,
        release: {
          id: String(release.id),
          tagName: release.tag_name,
          name: release.name ?? undefined,
          body: release.body ?? undefined,
          htmlUrl: release.html_url,
          isDraft: release.draft,
          isPrerelease: release.prerelease,
          publishedAt: release.published_at
            ? new Date(release.published_at).getTime()
            : undefined,
          createdAt: new Date(release.created_at).getTime(),
        },
        action,
      }
    );
  }

  return webhookJson({ success: true, action: "release_processed" });
}

async function handleIssueWebhook(
  ctx: WebhookCtx,
  payload: Record<string, unknown>
): Promise<Response> {
  const { issue, action, installation } = issuePayloadSchema.parse(payload);
  const installationId = String(installation.id);

  const connection = await ctx.runQuery(
    internal.integrations.github.queries.getConnectionByInstallation,
    { installationId }
  );

  if (connection) {
    await ctx.runMutation(
      internal.integrations.github.actions.processIssueWebhook,
      {
        connectionId: connection._id,
        organizationId: connection.organizationId,
        issue: {
          id: String(issue.id),
          number: issue.number,
          title: issue.title,
          body: issue.body ?? undefined,
          htmlUrl: issue.html_url,
          state: issue.state,
          labels: issue.labels.map((l) => l.name),
          author: issue.user?.login,
          authorAvatarUrl: issue.user?.avatar_url,
          milestone: issue.milestone?.title,
          assignees: issue.assignees.map((a) => a.login),
          createdAt: new Date(issue.created_at).getTime(),
          updatedAt: new Date(issue.updated_at).getTime(),
          closedAt: issue.closed_at
            ? new Date(issue.closed_at).getTime()
            : undefined,
        },
        action,
      }
    );
  }

  return webhookJson({ success: true, action: "issue_processed" });
}

async function handlePullRequestWebhook(
  ctx: WebhookCtx,
  payload: Record<string, unknown>
): Promise<Response> {
  const { pull_request, action, installation } =
    pullRequestPayloadSchema.parse(payload);

  if (action !== "closed" || !pull_request.merged) {
    return webhookJson({ success: true, action: "pr_ignored" });
  }

  const installationId = String(installation.id);

  const connection = await ctx.runQuery(
    internal.integrations.github.queries.getConnectionByInstallation,
    { installationId }
  );

  if (connection) {
    await ctx.runMutation(
      internal.integrations.github.actions.processPullRequestWebhook,
      {
        connectionId: connection._id,
        organizationId: connection.organizationId,
        pullRequest: {
          id: String(pull_request.id),
          number: pull_request.number,
          title: pull_request.title,
          body: pull_request.body ?? undefined,
          htmlUrl: pull_request.html_url,
          mergedAt: pull_request.merged_at
            ? new Date(pull_request.merged_at).getTime()
            : undefined,
          headRef: pull_request.head.ref,
          baseRef: pull_request.base.ref,
          authorLogin: pull_request.user?.login,
        },
      }
    );
  }

  return webhookJson({ success: true, action: "pr_processed" });
}

// ============================================
// SIGNATURE VERIFICATION
// ============================================

async function verifySignatureIfPresent(
  ctx: WebhookCtx,
  body: string,
  signature: string | null,
  payload: Record<string, unknown>
): Promise<Response | null> {
  if (!signature) {
    return null;
  }

  const installation = webhookInstallationSchema.safeParse(
    payload.installation
  );
  if (!installation.success) {
    return null;
  }

  const connection = await ctx.runQuery(
    internal.integrations.github.queries.getConnectionByInstallation,
    { installationId: String(installation.data.id) }
  );

  if (!connection?.webhookSecret) {
    return null;
  }

  const valid = await verifyWebhookSignature(
    body,
    signature,
    connection.webhookSecret
  );
  if (!valid) {
    return webhookJson({ error: "Invalid webhook signature" }, 401);
  }
  return null;
}

// ============================================
// EVENT ROUTING
// ============================================

async function routeWebhookEvent(
  ctx: WebhookCtx,
  eventType: string,
  payload: Record<string, unknown>
): Promise<Response> {
  if (eventType === "installation") {
    const result = await handleInstallationWebhook(ctx, payload);
    if (result) {
      return result;
    }
  }

  if (eventType === "release") {
    return await handleReleaseWebhook(ctx, payload);
  }

  if (eventType === "issues") {
    return await handleIssueWebhook(ctx, payload);
  }

  if (eventType === "pull_request") {
    return await handlePullRequestWebhook(ctx, payload);
  }

  return webhookJson({ success: true, event: eventType });
}

// ============================================
// ROUTE REGISTRATION
// ============================================

export function registerGithubWebhookRoutes(http: Router): void {
  http.route({
    path: "/github-webhook",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
      const eventType = request.headers.get("X-GitHub-Event");

      if (!eventType) {
        return new Response("Missing X-GitHub-Event header", { status: 400 });
      }

      const signature = request.headers.get("X-Hub-Signature-256");
      const body = await request.text();

      try {
        const parsed: unknown = JSON.parse(body);
        if (!isRecord(parsed)) {
          return webhookJson({ error: "Invalid webhook payload" }, 400);
        }

        const signatureError = await verifySignatureIfPresent(
          ctx,
          body,
          signature,
          parsed
        );
        if (signatureError) {
          return signatureError;
        }

        return await routeWebhookEvent(ctx, eventType, parsed);
      } catch (error) {
        return webhookJson(
          {
            error: "Failed to process webhook",
            message: error instanceof Error ? error.message : "Unknown error",
          },
          500
        );
      }
    }),
  });
}
