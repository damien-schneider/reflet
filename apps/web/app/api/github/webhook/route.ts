import { env } from "@reflet-v2/env/server";
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

interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string | null;
  html_url: string;
  state: "open" | "closed";
  labels: Array<{ name: string; color: string }>;
  user: { login: string; avatar_url: string } | null;
  milestone: { title: string } | null;
  assignees: Array<{ login: string }>;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}

interface GitHubWebhookPayload {
  action?: string;
  release?: GitHubRelease;
  issue?: GitHubIssue;
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
 * Handles release and issue events from GitHub
 */
export async function POST(request: Request): Promise<NextResponse> {
  const eventType = request.headers.get("x-github-event");
  const signature = request.headers.get("x-hub-signature-256");
  const deliveryId = request.headers.get("x-github-delivery");

  // Only handle release and issues events
  if (eventType !== "release" && eventType !== "issues") {
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

  try {
    // Verify webhook signature if a secret is configured
    const webhookSecret = env.GITHUB_WEBHOOK_SECRET;
    if (webhookSecret) {
      const isValid = await verifySignature(payload, signature, webhookSecret);
      if (!isValid) {
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 401 }
        );
      }
    }

    // Handle release events
    if (eventType === "release") {
      if (!(body.release && body.action)) {
        return NextResponse.json(
          { error: "Missing release data" },
          { status: 400 }
        );
      }

      const release = body.release;
      const action = body.action;

      console.log(
        `Received release webhook: ${action} for ${repositoryFullName} (delivery: ${deliveryId})`
      );

      return NextResponse.json({
        message: "Release webhook processed",
        action,
        release: {
          id: release.id,
          tagName: release.tag_name,
          name: release.name,
        },
      });
    }

    // Handle issue events
    if (eventType === "issues") {
      if (!(body.issue && body.action)) {
        return NextResponse.json(
          { error: "Missing issue data" },
          { status: 400 }
        );
      }

      const issue = body.issue;
      const action = body.action;

      console.log(
        `Received issue webhook: ${action} for ${repositoryFullName}#${issue.number} (delivery: ${deliveryId})`
      );

      return NextResponse.json({
        message: "Issue webhook processed",
        action,
        issue: {
          id: issue.id,
          number: issue.number,
          title: issue.title,
          state: issue.state,
          labels: issue.labels.map((l) => l.name),
        },
      });
    }

    return NextResponse.json({ message: "Event processed" }, { status: 200 });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
