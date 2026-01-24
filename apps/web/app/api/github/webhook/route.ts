import { NextResponse } from "next/server";

interface GitHubRelease {
  id: number;
  tag_name: string;
  name: string | null;
  body: string | null;
  html_url: string;
  draft: boolean;
  prerelease: boolean;
  published_at: string | null;
  created_at: string;
}

interface GitHubWebhookPayload {
  action?: string;
  release?: GitHubRelease;
  repository?: {
    full_name: string;
    id: number;
  };
  installation?: {
    id: number;
  };
}

/**
 * Verify GitHub webhook signature
 */
async function verifySignature(
  payload: string,
  signature: string | null,
  secret: string
): Promise<boolean> {
  if (!signature) {
    return false;
  }

  const crypto = await import("node:crypto");
  const expectedSignature = `sha256=${crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex")}`;

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * GitHub webhook handler
 * Handles release events from GitHub
 */
export async function POST(request: Request): Promise<NextResponse> {
  const eventType = request.headers.get("x-github-event");
  const signature = request.headers.get("x-hub-signature-256");
  const deliveryId = request.headers.get("x-github-delivery");

  // Only handle release events
  if (eventType !== "release") {
    return NextResponse.json(
      { message: "Event type ignored" },
      { status: 200 }
    );
  }

  const payload = await request.text();

  let body: GitHubWebhookPayload;
  try {
    body = JSON.parse(payload) as GitHubWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const installationId = body.installation?.id;
  const repositoryFullName = body.repository?.full_name;

  if (!(installationId && repositoryFullName)) {
    return NextResponse.json(
      { error: "Missing installation or repository info" },
      { status: 400 }
    );
  }

  // Find the connection by installation ID
  // Note: We need to use internal query here since webhook doesn't have auth
  // This is a simplified version - in production, you'd verify the webhook secret
  // against the stored secret for this specific connection

  try {
    // For webhook verification, we need to find the connection first
    // In a real implementation, you'd have a way to look up by installation ID
    // For now, we'll use a server-side query

    // Verify webhook signature if a secret is configured
    // This is a basic implementation - in production, you'd look up the secret
    // from the database for this specific installation
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
    if (webhookSecret) {
      const isValid = await verifySignature(payload, signature, webhookSecret);
      if (!isValid) {
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 401 }
        );
      }
    }

    // Extract release data
    if (!(body.release && body.action)) {
      return NextResponse.json(
        { error: "Missing release data" },
        { status: 400 }
      );
    }

    const release = body.release;
    const action = body.action;

    // Process the release event
    // In production, this would use an internal action to find the connection
    // and process the webhook securely

    console.log(
      `Received release webhook: ${action} for ${repositoryFullName} (delivery: ${deliveryId})`
    );

    // For now, return success - the actual processing would be done via internal mutation
    // based on finding the connection by installation ID

    return NextResponse.json({
      message: "Webhook processed",
      action,
      release: {
        id: release.id,
        tagName: release.tag_name,
        name: release.name,
      },
    });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
