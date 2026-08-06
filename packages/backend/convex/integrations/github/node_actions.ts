"use node";

import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { internalAction } from "../../_generated/server";

// GitHub API base URL
const GITHUB_API_URL = "https://api.github.com";

/**
 * Push a published Reflet release to GitHub as a GitHub Release.
 * Scheduled from the publish mutation when pushToGithubOnPublish is enabled.
 */
export const pushReleaseToGithub = internalAction({
  args: {
    manual: v.optional(v.boolean()),
    releaseId: v.id("releases"),
  },
  handler: async (ctx, args) => {
    const release = await ctx.runQuery(
      internal.changelog.notifications_helpers.getRelease,
      { releaseId: args.releaseId }
    );

    if (!release) {
      console.error("[GitHub Push] Release not found:", args.releaseId);
      return;
    }

    const org = await ctx.runQuery(
      internal.changelog.notifications_helpers.getOrganization,
      { organizationId: release.organizationId }
    );

    if (!org) {
      console.error(
        "[GitHub Push] Organization not found:",
        release.organizationId
      );
      return;
    }

    if (!args.manual && org.changelogSettings?.pushToGithubOnPublish !== true) {
      return;
    }

    const connection = await ctx.runQuery(
      internal.integrations.github.queries.getConnectionInternal,
      { organizationId: release.organizationId }
    );

    if (!connection?.repositoryFullName) {
      console.error(
        "[GitHub Push] No GitHub connection or repository configured for org:",
        release.organizationId
      );
      return;
    }

    // Skip if this release was already synced from GitHub (avoid loops)
    if (release.syncedFromGithub) {
      return;
    }

    // Skip if this release already has a linked GitHub release
    if (release.githubReleaseId) {
      return;
    }

    // Set status to pending before making the API call
    await ctx.runMutation(
      internal.integrations.github.release_mutations.updateGithubPushStatus,
      {
        releaseId: args.releaseId,
        status: "pending",
      }
    );

    const { token } = await ctx.runAction(
      internal.integrations.github.node_actions.getInstallationTokenInternal,
      { installationId: connection.installationId }
    );

    const tagName = release.version || `v${Date.now()}`;
    const targetBranch =
      org.changelogSettings?.targetBranch ??
      connection.repositoryDefaultBranch ??
      "main";

    const response = await fetch(
      `${GITHUB_API_URL}/repos/${connection.repositoryFullName}/releases`,
      {
        body: JSON.stringify({
          body: release.description ?? "",
          draft: false,
          name: release.title,
          prerelease: false,
          tag_name: tagName,
          target_commitish: targetBranch,
        }),
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        method: "POST",
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      const errorMessage = `Failed to create GitHub release: ${response.statusText} - ${errorText}`;
      console.error(`[GitHub Push] ${errorMessage}`);

      const errorType =
        response.status === 403 ? "permission_denied" : "unknown";

      await ctx.runMutation(
        internal.integrations.github.release_mutations.updateGithubPushStatus,
        {
          error: errorMessage,
          errorType,
          releaseId: args.releaseId,
          status: "failed",
        }
      );
      return;
    }

    const githubRelease = (await response.json()) as {
      id: number;
      html_url: string;
    };

    // Save the GitHub release ID and URL back to the Reflet release
    await ctx.runMutation(
      internal.integrations.github.release_mutations.linkGithubRelease,
      {
        githubHtmlUrl: githubRelease.html_url,
        githubReleaseId: String(githubRelease.id),
        releaseId: args.releaseId,
      }
    );

    await ctx.runMutation(
      internal.integrations.github.release_mutations.updateGithubPushStatus,
      {
        releaseId: args.releaseId,
        status: "success",
      }
    );
  },
});

/**
 * Internal version of getInstallationToken for use from other internal actions
 */
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

    const crypto = await import("node:crypto");
    const sign = crypto.createSign("RSA-SHA256");
    sign.update(`${header}.${payloadBase64}`);
    const signature = sign.sign(privateKey.replace(/\\n/g, "\n"), "base64url");

    const jwt = `${header}.${payloadBase64}.${signature}`;

    const response = await fetch(
      `${GITHUB_API_URL}/app/installations/${args.installationId}/access_tokens`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${jwt}`,
          "X-GitHub-Api-Version": "2022-11-28",
        },
        method: "POST",
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to get installation token: ${response.statusText} - ${errorText}`
      );
    }

    const data = (await response.json()) as {
      token: string;
      expires_at: string;
    };
    return {
      expiresAt: data.expires_at,
      token: data.token,
    };
  },
});
