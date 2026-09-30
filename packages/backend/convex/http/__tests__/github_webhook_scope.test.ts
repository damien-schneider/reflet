/// <reference types="vite/client" />

import { afterEach, describe, expect, test, vi } from "vitest";
import { hmacSha256Hex } from "../../shared/hmac";
import { seedGithubConnection, seedOrganization } from "../../test.fixtures";
import { setupTest } from "../../test.helpers";

const APP_SECRET = "app-webhook-secret";
const REPOSITORY_SECRET = "repository-webhook-secret";
const INSTALLATION_ID = 4242;
const LINKED_REPOSITORY_ID = 100;
const OTHER_REPOSITORY_ID = 200;

const setup = async () => {
  vi.stubEnv("GITHUB_WEBHOOK_SECRET", APP_SECRET);
  const t = setupTest();
  const organizationId = await t.run(async (ctx) => {
    const orgId = await seedOrganization(ctx);
    await seedGithubConnection(ctx, orgId, {
      installationId: String(INSTALLATION_ID),
      repositoryId: String(LINKED_REPOSITORY_ID),
      webhookSecret: REPOSITORY_SECRET,
    });
    return orgId;
  });
  return { organizationId, t };
};

const releaseEvent = (repositoryId: number) => ({
  action: "published",
  installation: { id: INSTALLATION_ID },
  release: {
    body: "Notes",
    created_at: "2026-01-01T00:00:00Z",
    draft: false,
    html_url: "https://github.com/acme/app/releases/v1",
    id: repositoryId + 1,
    name: "v1",
    prerelease: false,
    published_at: "2026-01-01T00:00:00Z",
    tag_name: "v1",
  },
  repository: { full_name: `acme/repo-${repositoryId}`, id: repositoryId },
});

const deliver = async (
  t: ReturnType<typeof setupTest>,
  event: { payload: unknown; secret: string; type: string }
): Promise<Response> => {
  const body = JSON.stringify(event.payload);
  return await t.fetch("/github-webhook", {
    body,
    headers: {
      "X-GitHub-Event": event.type,
      "X-Hub-Signature-256": `sha256=${await hmacSha256Hex(event.secret, body)}`,
    },
    method: "POST",
  });
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("GitHub webhook repository scope", () => {
  test("ignores releases from a repository the org did not link", async () => {
    const { t } = await setup();

    const response = await deliver(t, {
      payload: releaseEvent(OTHER_REPOSITORY_ID),
      secret: APP_SECRET,
      type: "release",
    });

    expect(response.status).toBe(200);
    const stored = await t.run((ctx) =>
      ctx.db.query("githubReleases").collect()
    );
    expect(stored).toEqual([]);
  });

  test("stores releases from the linked repository", async () => {
    const { t } = await setup();

    await deliver(t, {
      payload: releaseEvent(LINKED_REPOSITORY_ID),
      secret: APP_SECRET,
      type: "release",
    });

    const stored = await t.run((ctx) =>
      ctx.db.query("githubReleases").collect()
    );
    expect(stored.map((release) => release.tagName)).toEqual(["v1"]);
  });

  test("rejects a repository secret replayed for another repository", async () => {
    const { t } = await setup();

    const response = await deliver(t, {
      payload: releaseEvent(OTHER_REPOSITORY_ID),
      secret: REPOSITORY_SECRET,
      type: "release",
    });

    expect(response.status).toBe(401);
  });

  test("a repository secret cannot delete the installation", async () => {
    const { t } = await setup();

    await deliver(t, {
      payload: {
        action: "deleted",
        installation: { id: INSTALLATION_ID },
        repository: {
          full_name: "acme/repo-100",
          id: LINKED_REPOSITORY_ID,
        },
      },
      secret: REPOSITORY_SECRET,
      type: "installation",
    });

    const connections = await t.run((ctx) =>
      ctx.db.query("githubConnections").collect()
    );
    expect(connections).toHaveLength(1);
  });
});
