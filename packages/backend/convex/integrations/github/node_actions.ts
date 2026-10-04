"use node";

import { createSign } from "node:crypto";
import { v } from "convex/values";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { Doc, Id } from "../../_generated/dataModel";
import { type ActionCtx, internalAction } from "../../_generated/server";
import { GITHUB_API_URL, githubApiHeaders } from "./github_constants";

const HTTP_NOT_FOUND = 404;
const HTTP_FORBIDDEN = 403;

const githubReleaseResponseSchema = z.object({
  html_url: z.string(),
  id: z.number(),
});

const installationTokenResponseSchema = z.object({
  expires_at: z.string(),
  token: z.string(),
});

interface PushFailure {
  error: string;
  errorType: string;
}

interface PushTarget {
  manual: boolean;
  release: Doc<"releases">;
  repositoryFullName: string;
  targetCommitish: string;
  version: string;
}

async function markPushFailed(
  ctx: ActionCtx,
  releaseId: Id<"releases">,
  failure: PushFailure
): Promise<void> {
  await ctx.runMutation(
    internal.integrations.github.release_mutations.updateGithubPushStatus,
    { ...failure, releaseId, status: "failed" }
  );
}

async function sendReleaseToGithub(
  ctx: ActionCtx,
  target: PushTarget,
  token: string
): Promise<PushFailure | null> {
  const { release } = target;
  const releasesUrl = `${GITHUB_API_URL}/repos/${target.repositoryFullName}/releases`;
  const headers = githubApiHeaders(token);
  const pushed = {
    body: release.description ?? "",
    name: release.title,
    tagName: target.version,
  };
  const proseFields = {
    body: pushed.body,
    name: pushed.name,
    tag_name: pushed.tagName,
  };
  const patchRelease = (githubReleaseId: string) =>
    fetch(`${releasesUrl}/${githubReleaseId}`, {
      body: JSON.stringify(proseFields),
      headers,
      method: "PATCH",
    });

  let response = release.githubReleaseId
    ? await patchRelease(release.githubReleaseId)
    : null;
  if (response?.status === HTTP_NOT_FOUND) {
    await ctx.runMutation(
      internal.integrations.github.release_mutations.clearGithubLink,
      { releaseId: release._id }
    );
    response = null;
  }

  if (!response) {
    const releaseWithTag = await fetch(
      `${releasesUrl}/tags/${encodeURIComponent(target.version)}`,
      { headers }
    );
    if (releaseWithTag.ok && !target.manual) {
      return {
        error: `A GitHub release already uses tag ${target.version}. Push manually to replace its notes.`,
        errorType: "tag_exists",
      };
    }
    response = releaseWithTag.ok
      ? await patchRelease(
          String(
            githubReleaseResponseSchema.parse(await releaseWithTag.json()).id
          )
        )
      : await fetch(releasesUrl, {
          body: JSON.stringify({
            ...proseFields,
            draft: false,
            prerelease: false,
            target_commitish: target.targetCommitish,
          }),
          headers,
          method: "POST",
        });
  }

  if (!response.ok) {
    return {
      error: `GitHub rejected the release: ${response.status} ${await response.text()}`,
      errorType:
        response.status === HTTP_FORBIDDEN ? "permission_denied" : "unknown",
    };
  }

  const githubRelease = githubReleaseResponseSchema.parse(
    await response.json()
  );
  await ctx.runMutation(
    internal.integrations.github.release_mutations.recordGithubPush,
    {
      githubHtmlUrl: githubRelease.html_url,
      githubReleaseId: String(githubRelease.id),
      pushed,
      releaseId: release._id,
      syncedAt: release.updatedAt,
    }
  );
  return null;
}

export const pushReleaseToGithub = internalAction({
  args: {
    manual: v.optional(v.boolean()),
    releaseId: v.id("releases"),
  },
  handler: async (ctx, args) => {
    const context = await ctx.runQuery(
      internal.integrations.github.queries.getReleasePushContext,
      { releaseId: args.releaseId }
    );
    if (!context?.organization) {
      return;
    }
    const { connection, headSha, organization, release } = context;
    const settings = organization.changelogSettings;
    const manual = args.manual === true;

    if (!manual && settings?.pushToGithubOnPublish !== true) {
      return;
    }
    if (!connection?.repositoryFullName || release.syncedFromGithub) {
      return;
    }
    const linkedToGithubReleaseRefletDidNotAuthor =
      release.githubReleaseId !== undefined &&
      release.githubSyncedAt === undefined;
    if (!manual && linkedToGithubReleaseRefletDidNotAuthor) {
      return;
    }
    if (!release.version) {
      await markPushFailed(ctx, release._id, {
        error: "Set a version before pushing — it becomes the git tag.",
        errorType: "missing_version",
      });
      return;
    }

    await ctx.runMutation(
      internal.integrations.github.release_mutations.updateGithubPushStatus,
      { releaseId: release._id, status: "pending" }
    );

    try {
      const { token } = await ctx.runAction(
        internal.integrations.github.node_actions.getInstallationTokenInternal,
        { installationId: connection.installationId }
      );
      const target: PushTarget = {
        manual,
        release,
        repositoryFullName: connection.repositoryFullName,
        targetCommitish:
          headSha ??
          settings?.targetBranch ??
          connection.repositoryDefaultBranch ??
          "main",
        version: release.version,
      };
      const failure = await sendReleaseToGithub(ctx, target, token);
      if (failure) {
        await markPushFailed(ctx, release._id, failure);
      }
    } catch (error) {
      await markPushFailed(ctx, release._id, {
        error: error instanceof Error ? error.message : "Push to GitHub failed",
        errorType: "unknown",
      });
    }
  },
});

export const getInstallationTokenInternal = internalAction({
  args: {
    installationId: v.string(),
  },
  handler: async (_ctx, args) => {
    const appId = process.env.GITHUB_APP_ID;
    const privateKey = process.env.GITHUB_APP_PRIVATE_KEY;

    if (!(appId && privateKey)) {
      throw new Error("GitHub App credentials not configured");
    }

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      exp: now + 600,
      iat: now - 60,
      iss: appId,
    };

    const header = Buffer.from(
      JSON.stringify({ alg: "RS256", typ: "JWT" })
    ).toString("base64url");
    const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString(
      "base64url"
    );

    const sign = createSign("RSA-SHA256");
    sign.update(`${header}.${payloadBase64}`);
    const signature = sign.sign(privateKey.replace(/\\n/g, "\n"), "base64url");

    const jwt = `${header}.${payloadBase64}.${signature}`;

    const response = await fetch(
      `${GITHUB_API_URL}/app/installations/${args.installationId}/access_tokens`,
      {
        headers: githubApiHeaders(jwt),
        method: "POST",
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to get installation token: ${response.statusText} - ${errorText}`
      );
    }

    const data = installationTokenResponseSchema.parse(await response.json());
    return {
      expiresAt: data.expires_at,
      token: data.token,
    };
  },
});
