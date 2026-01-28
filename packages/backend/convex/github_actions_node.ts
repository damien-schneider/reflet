"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";

// GitHub API base URL
const GITHUB_API_URL = "https://api.github.com";

/**
 * Get installation access token from GitHub App
 * This action requires Node.js runtime for crypto operations
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
    const signature = sign.sign(
      privateKey.replaceAll("\\n", "\n"),
      "base64url"
    );

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
