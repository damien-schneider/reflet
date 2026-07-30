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
  action: z.string(),
  installation: webhookInstallationSchema,
  release: z.object({
    body: z.string().nullable(),
    created_at: z.string(),
    draft: z.boolean(),
    html_url: z.string(),
    id: z.number(),
    name: z.string().nullable(),
    prerelease: z.boolean(),
    published_at: z.string().nullable(),
    tag_name: z.string(),
  }),
});

const issuePayloadSchema = z.object({
  action: z.string(),
  installation: webhookInstallationSchema,
  issue: z.object({
    assignees: z.array(z.object({ login: z.string() })),
    body: z.string().nullable(),
    closed_at: z.string().nullable(),
    created_at: z.string(),
    html_url: z.string(),
    id: z.number(),
    labels: z.array(z.object({ name: z.string() })),
    milestone: z.object({ title: z.string() }).nullable(),
    number: z.number(),
    state: z.enum(["open", "closed"]),
    title: z.string(),
    updated_at: z.string(),
    user: z.object({ avatar_url: z.string(), login: z.string() }).nullable(),
  }),
});

const pullRequestPayloadSchema = z.object({
  action: z.string(),
  installation: webhookInstallationSchema,
  pull_request: z.object({
    base: z.object({ ref: z.string() }),
    body: z.string().nullable(),
    head: z.object({ ref: z.string(), sha: z.string() }),
    html_url: z.string(),
    id: z.number(),
    merged: z.boolean(),
    merged_at: z.string().nullable(),
    number: z.number(),
    state: z.enum(["open", "closed"]),
    title: z.string(),
    user: z.object({ avatar_url: z.string(), login: z.string() }).nullable(),
  }),
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
    headers: { "Content-Type": "application/json" },
    status,
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
    { hash: "SHA-256", name: "HMAC" },
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
    { hash: "SHA-256", name: "HMAC" },
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
  return webhookJson({ action: "installation_deleted", success: true });
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
        action,
        connectionId: connection._id,
        organizationId: connection.organizationId,
        release: {
          body: release.body ?? undefined,
          createdAt: new Date(release.created_at).getTime(),
          htmlUrl: release.html_url,
          id: String(release.id),
          isDraft: release.draft,
          isPrerelease: release.prerelease,
          name: release.name ?? undefined,
          publishedAt: release.published_at
            ? new Date(release.published_at).getTime()
            : undefined,
          tagName: release.tag_name,
        },
      }
    );
  }

  return webhookJson({ action: "release_processed", success: true });
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
        action,
        connectionId: connection._id,
        issue: {
          assignees: issue.assignees.map((a) => a.login),
          author: issue.user?.login,
          authorAvatarUrl: issue.user?.avatar_url,
          body: issue.body ?? undefined,
          closedAt: issue.closed_at
            ? new Date(issue.closed_at).getTime()
            : undefined,
          createdAt: new Date(issue.created_at).getTime(),
          htmlUrl: issue.html_url,
          id: String(issue.id),
          labels: issue.labels.map((l) => l.name),
          milestone: issue.milestone?.title,
          number: issue.number,
          state: issue.state,
          title: issue.title,
          updatedAt: new Date(issue.updated_at).getTime(),
        },
        organizationId: connection.organizationId,
      }
    );
  }

  return webhookJson({ action: "issue_processed", success: true });
}

async function handlePullRequestWebhook(
  ctx: WebhookCtx,
  payload: Record<string, unknown>
): Promise<Response> {
  const { pull_request, action, installation } =
    pullRequestPayloadSchema.parse(payload);

  if (action !== "closed" || !pull_request.merged) {
    return webhookJson({ action: "pr_ignored", success: true });
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
          authorLogin: pull_request.user?.login,
          baseRef: pull_request.base.ref,
          body: pull_request.body ?? undefined,
          headRef: pull_request.head.ref,
          htmlUrl: pull_request.html_url,
          id: String(pull_request.id),
          mergedAt: pull_request.merged_at
            ? new Date(pull_request.merged_at).getTime()
            : undefined,
          number: pull_request.number,
          title: pull_request.title,
        },
      }
    );
  }

  return webhookJson({ action: "pr_processed", success: true });
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

  return webhookJson({ event: eventType, success: true });
}

// ============================================
// ROUTE REGISTRATION
// ============================================

export function registerGithubWebhookRoutes(http: Router): void {
  http.route({
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
    method: "POST",
    path: "/github-webhook",
  });
}
