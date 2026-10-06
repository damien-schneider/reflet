import { NextResponse } from "next/server";
import {
  redirectToAppInstallation,
  requestUserAuthorization,
} from "../connect-flow";

/**
 * Starts a GitHub connection with user authorization, so an account that
 * already has the app installed connects without GitHub's install page.
 * `account=new` goes straight to the install page to add another account.
 */
export async function GET(request: Request): Promise<NextResponse> {
  if (request.headers.get("sec-fetch-site") !== "same-origin") {
    return NextResponse.json(
      { error: "GitHub connection must start from Reflet" },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const step = {
    installationId: null,
    organizationId: searchParams.get("organizationId"),
    orgSlug: searchParams.get("orgSlug"),
    returnTo: searchParams.get("returnTo"),
    setupAction: null,
  };

  if (searchParams.get("account") === "new") {
    return await redirectToAppInstallation(step);
  }
  return await requestUserAuthorization(request.url, step);
}
