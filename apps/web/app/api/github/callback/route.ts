import { api } from "@reflet-v2/backend/convex/_generated/api";
import { fetchMutation } from "convex/nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/**
 * GitHub App installation callback handler
 * This is called after a user installs the GitHub App
 */
export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);

  const installationId = searchParams.get("installation_id");
  const setupAction = searchParams.get("setup_action");

  if (!installationId) {
    return NextResponse.redirect(
      new URL("/dashboard?error=missing_installation_id", request.url)
    );
  }

  // Get the organization ID from the state cookie
  const cookieStore = await cookies();
  const orgIdCookie = cookieStore.get("github_oauth_org_id");

  if (!orgIdCookie?.value) {
    return NextResponse.redirect(
      new URL("/dashboard?error=missing_org_context", request.url)
    );
  }

  const organizationId = orgIdCookie.value;

  // Clear the cookie
  cookieStore.delete("github_oauth_org_id");

  try {
    // Fetch installation details from GitHub
    const appId = process.env.GITHUB_APP_ID;
    const privateKey = process.env.GITHUB_APP_PRIVATE_KEY;

    if (!(appId && privateKey)) {
      throw new Error("GitHub App credentials not configured");
    }

    // Create JWT for GitHub App authentication
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iat: now - 60,
      exp: now + 600,
      iss: appId,
    };

    const crypto = await import("node:crypto");
    const header = Buffer.from(
      JSON.stringify({ alg: "RS256", typ: "JWT" })
    ).toString("base64url");
    const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString(
      "base64url"
    );
    const sign = crypto.createSign("RSA-SHA256");
    sign.update(`${header}.${payloadBase64}`);
    const signature = sign.sign(privateKey.replace(/\\n/g, "\n"), "base64url");
    const jwt = `${header}.${payloadBase64}.${signature}`;

    // Get installation details
    const installationResponse = await fetch(
      `https://api.github.com/app/installations/${installationId}`,
      {
        headers: {
          Authorization: `Bearer ${jwt}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );

    if (!installationResponse.ok) {
      throw new Error(
        `Failed to fetch installation: ${installationResponse.statusText}`
      );
    }

    const installation = (await installationResponse.json()) as {
      account: {
        login: string;
        type: string;
        avatar_url: string;
      };
    };

    // Save the installation to the database
    await fetchMutation(api.github.saveInstallation, {
      organizationId: organizationId as Parameters<
        typeof api.github.saveInstallation
      >[0]["organizationId"],
      installationId,
      accountType:
        installation.account.type === "Organization" ? "organization" : "user",
      accountLogin: installation.account.login,
      accountAvatarUrl: installation.account.avatar_url,
    });

    // Get the organization slug for redirect
    const orgResponse = await fetch(
      `${process.env.NEXT_PUBLIC_CONVEX_URL}/api/query`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          path: "organizations:get",
          args: { id: organizationId },
        }),
      }
    );

    let redirectPath = "/dashboard";
    if (orgResponse.ok) {
      const org = await orgResponse.json();
      if (org?.slug) {
        redirectPath = `/dashboard/${org.slug}/settings/github?success=connected`;
      }
    }

    // If this is a new installation, redirect to repo selection
    if (setupAction === "install") {
      return NextResponse.redirect(
        new URL(`${redirectPath}&step=select_repo`, request.url)
      );
    }

    return NextResponse.redirect(new URL(redirectPath, request.url));
  } catch (error) {
    console.error("GitHub callback error:", error);
    return NextResponse.redirect(
      new URL(
        `/dashboard?error=github_connection_failed&message=${encodeURIComponent(
          error instanceof Error ? error.message : "Unknown error"
        )}`,
        request.url
      )
    );
  }
}
