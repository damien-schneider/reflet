"use node";

import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action, internalAction } from "./_generated/server";

// GitHub API base URL
const GITHUB_API_URL = "https://api.github.com";

/**
 * Create or update a file in a GitHub repository (for workflow file)
 */
export const createOrUpdateFile = action({
  args: {
    installationToken: v.string(),
    repositoryFullName: v.string(),
    path: v.string(),
    content: v.string(),
    message: v.string(),
    branch: v.string(),
  },
  handler: async (_ctx, args) => {
    // First, try to get the file to see if it exists (to get the SHA)
    const getResponse = await fetch(
      `${GITHUB_API_URL}/repos/${args.repositoryFullName}/contents/${args.path}?ref=${args.branch}`,
      {
        headers: {
          Authorization: `Bearer ${args.installationToken}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );

    let sha: string | undefined;
    if (getResponse.ok) {
      const existingFile = (await getResponse.json()) as { sha: string };
      sha = existingFile.sha;
    }

    // Create or update the file
    const response = await fetch(
      `${GITHUB_API_URL}/repos/${args.repositoryFullName}/contents/${args.path}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${args.installationToken}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: args.message,
          content: Buffer.from(args.content).toString("base64"),
          branch: args.branch,
          ...(sha ? { sha } : {}),
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to create/update file: ${response.statusText} - ${errorText}`
      );
    }

    return { success: true };
  },
});

/**
 * Get installation access token from GitHub App
 */
export const getInstallationToken = action({
  args: {
    installationId: v.string(),
  },
  handler: async (_ctx, args) => {
    const appId = process.env.GITHUB_APP_ID;
    const privateKey = process.env.GITHUB_APP_PRIVATE_KEY;

    if (!(appId && privateKey)) {
      throw new Error("GitHub App credentials not configured");
    }

    // Create JWT for GitHub App authentication
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iat: now - 60, // Issued at time (60 seconds in the past to allow for clock drift)
      exp: now + 600, // Expiration time (10 minutes)
      iss: appId,
    };

    // Simple JWT creation (you may want to use a proper JWT library)
    const header = Buffer.from(
      JSON.stringify({ alg: "RS256", typ: "JWT" })
    ).toString("base64url");
    const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString(
      "base64url"
    );

    // For proper JWT signing, you'd need a crypto library
    // This is a simplified version - in production, use a proper JWT library
    const crypto = await import("node:crypto");
    const sign = crypto.createSign("RSA-SHA256");
    sign.update(`${header}.${payloadBase64}`);
    const signature = sign.sign(privateKey.replace(/\\n/g, "\n"), "base64url");

    const jwt = `${header}.${payloadBase64}.${signature}`;

    // Get installation access token
    const response = await fetch(
      `${GITHUB_API_URL}/app/installations/${args.installationId}/access_tokens`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${jwt}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
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
      token: data.token,
      expiresAt: data.expires_at,
    };
  },
});

/**
 * Push a published Reflet release to GitHub as a GitHub Release.
 * Scheduled from the publish mutation when pushToGithubOnPublish is enabled.
 */
export const pushReleaseToGithub = internalAction({
  args: {
    releaseId: v.id("releases"),
    manual: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const release = await ctx.runQuery(
      internal.changelog_notifications_helpers.getRelease,
      { releaseId: args.releaseId }
    );

    if (!release) {
      console.error("[GitHub Push] Release not found:", args.releaseId);
      return;
    }

    const org = await ctx.runQuery(
      internal.changelog_notifications_helpers.getOrganization,
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
      internal.github.getConnectionInternal,
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

    const { token } = await ctx.runAction(
      internal.github_node_actions.getInstallationTokenInternal,
      { installationId: connection.installationId }
    );

    const tagName = release.version || `v${Date.now()}`;

    const response = await fetch(
      `${GITHUB_API_URL}/repos/${connection.repositoryFullName}/releases`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tag_name: tagName,
          name: release.title,
          body: release.description ?? "",
          draft: false,
          prerelease: false,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `[GitHub Push] Failed to create GitHub release: ${response.statusText} - ${errorText}`
      );
      return;
    }

    const githubRelease = (await response.json()) as {
      id: number;
      html_url: string;
    };

    // Save the GitHub release ID and URL back to the Reflet release
    await ctx.runMutation(internal.github.linkGithubRelease, {
      releaseId: args.releaseId,
      githubReleaseId: String(githubRelease.id),
      githubHtmlUrl: githubRelease.html_url,
    });
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
      iat: now - 60,
      exp: now + 600,
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
        method: "POST",
        headers: {
          Authorization: `Bearer ${jwt}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
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
      token: data.token,
      expiresAt: data.expires_at,
    };
  },
});
