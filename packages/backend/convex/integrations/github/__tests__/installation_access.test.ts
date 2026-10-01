/// <reference types="vite/client" />
import { afterEach, describe, expect, test, vi } from "vitest";
import { api } from "../../../_generated/api";
import { setupTest } from "../../../test.helpers";
import type { AccessibleRepository } from "../user_access";

const MALLORY = { _id: "user_mallory", email: "mallory@example.com" };
const ALICE_INSTALLATION_ID = "1001";
const MALLORY_INSTALLATION_ID = "2002";
const INSTALLATION_REPOSITORIES_PATH =
  /^\/user\/installations\/(\d+)\/repositories$/;

interface FakeInstallation {
  createdAt?: string;
  id: number;
  login: string;
  repositories: { full_name: string; id: number }[];
}

const githubUserApiResponse = (
  url: URL,
  installationPages: FakeInstallation[][]
): Response => {
  if (url.pathname === "/user/installations") {
    const pageNumber = Number(url.searchParams.get("page") ?? "1");
    const installations = installationPages[pageNumber - 1] ?? [];
    const nextPageLink = `<${url.origin}${url.pathname}?per_page=100&page=${pageNumber + 1}>; rel="next"`;
    return Response.json(
      {
        installations: installations.map((installation) => ({
          account: {
            avatar_url: `https://github.com/${installation.login}.png`,
            login: installation.login,
            type: "User",
          },
          created_at: installation.createdAt ?? "2024-01-01T00:00:00Z",
          id: installation.id,
        })),
      },
      pageNumber < installationPages.length
        ? { headers: { Link: nextPageLink } }
        : undefined
    );
  }

  const requestedInstallationId = url.pathname.match(
    INSTALLATION_REPOSITORIES_PATH
  )?.[1];
  const installation = installationPages
    .flat()
    .find((candidate) => String(candidate.id) === requestedInstallationId);
  if (installation) {
    return Response.json({ repositories: installation.repositories });
  }
  return new Response("Not Found", { status: 404 });
};

const stubGithubUserApi = (installationPages: FakeInstallation[][]) => {
  vi.stubGlobal(
    "fetch",
    vi.fn((input: string) =>
      Promise.resolve(githubUserApiResponse(new URL(input), installationPages))
    )
  );
};

const setupMalloryOrg = async () => {
  const t = setupTest({ authUsers: [MALLORY] });
  const organizationId = await t.run(async (ctx) => {
    const orgId = await ctx.db.insert("organizations", {
      createdAt: Date.now(),
      isPublic: false,
      name: "Mallory Org",
      slug: "mallory-org",
      subscriptionStatus: "none",
      subscriptionTier: "free",
    });
    await ctx.db.insert("organizationMembers", {
      createdAt: Date.now(),
      organizationId: orgId,
      role: "admin",
      userId: MALLORY._id,
    });
    return orgId;
  });

  return {
    insertAliceConnection: (accessibleRepositories?: AccessibleRepository[]) =>
      t.run((ctx) =>
        ctx.db.insert("githubConnections", {
          accessibleRepositories,
          accountLogin: "alice",
          accountType: "user",
          createdAt: Date.now(),
          installationId: ALICE_INSTALLATION_ID,
          organizationId,
          status: "connected",
          updatedAt: Date.now(),
        })
      ),
    mallory: t.withIdentity({ sessionId: MALLORY._id, subject: MALLORY._id }),
    organizationId,
    orgConnection: () =>
      t.run((ctx) =>
        ctx.db
          .query("githubConnections")
          .withIndex("by_organization", (q) =>
            q.eq("organizationId", organizationId)
          )
          .first()
      ),
    userConnections: () =>
      t.run((ctx) => ctx.db.query("userGithubConnections").collect()),
  };
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("connectInstallation", () => {
  test("rejects an installation id the caller's GitHub account cannot access", async () => {
    const { mallory, orgConnection, organizationId, userConnections } =
      await setupMalloryOrg();
    stubGithubUserApi([
      [
        {
          id: Number(MALLORY_INSTALLATION_ID),
          login: "mallory",
          repositories: [],
        },
      ],
    ]);

    await expect(
      mallory.action(api.integrations.github.actions.connectInstallation, {
        githubUserToken: "mallory-token",
        installationId: ALICE_INSTALLATION_ID,
        organizationId,
      })
    ).rejects.toThrow("cannot access this GitHub App installation");

    expect(await orgConnection()).toBeNull();
    expect(await userConnections()).toEqual([]);
  });

  test("saves the account and repositories GitHub reports, across pages", async () => {
    const { mallory, orgConnection, organizationId } = await setupMalloryOrg();
    stubGithubUserApi([
      [{ id: 3003, login: "someone-else", repositories: [] }],
      [
        {
          id: Number(MALLORY_INSTALLATION_ID),
          login: "mallory-labs",
          repositories: [{ full_name: "mallory-labs/app", id: 77 }],
        },
      ],
    ]);

    await mallory.action(api.integrations.github.actions.connectInstallation, {
      githubUserToken: "mallory-token",
      installationId: MALLORY_INSTALLATION_ID,
      organizationId,
    });

    expect(await orgConnection()).toMatchObject({
      accessibleRepositories: [{ fullName: "mallory-labs/app", id: "77" }],
      accountLogin: "mallory-labs",
      installationId: MALLORY_INSTALLATION_ID,
      linkedByUserId: MALLORY._id,
    });
  });

  test("asks for an install when the GitHub account has none", async () => {
    const { mallory, orgConnection, organizationId } = await setupMalloryOrg();
    stubGithubUserApi([[]]);

    const result = await mallory.action(
      api.integrations.github.actions.connectInstallation,
      { githubUserToken: "mallory-token", organizationId }
    );

    expect(result).toEqual({ status: "needs_installation" });
    expect(await orgConnection()).toBeNull();
  });

  test("reconnects the installation the user connected before over a newer one", async () => {
    const { mallory, orgConnection, organizationId } = await setupMalloryOrg();
    stubGithubUserApi([
      [
        {
          createdAt: "2023-01-01T00:00:00Z",
          id: Number(MALLORY_INSTALLATION_ID),
          login: "mallory",
          repositories: [],
        },
        {
          createdAt: "2025-01-01T00:00:00Z",
          id: 4004,
          login: "mallory-labs",
          repositories: [],
        },
      ],
    ]);
    await mallory.action(api.integrations.github.actions.connectInstallation, {
      githubUserToken: "mallory-token",
      installationId: MALLORY_INSTALLATION_ID,
    });

    await mallory.action(api.integrations.github.actions.connectInstallation, {
      githubUserToken: "mallory-token",
      organizationId,
    });

    expect(await orgConnection()).toMatchObject({
      installationId: MALLORY_INSTALLATION_ID,
    });
  });

  test("picks the newest installation when none was connected before", async () => {
    const { mallory, orgConnection, organizationId } = await setupMalloryOrg();
    stubGithubUserApi([
      [
        {
          createdAt: "2023-01-01T00:00:00Z",
          id: 3003,
          login: "old",
          repositories: [],
        },
      ],
      [
        {
          createdAt: "2025-01-01T00:00:00Z",
          id: 4004,
          login: "new",
          repositories: [],
        },
      ],
    ]);

    await mallory.action(api.integrations.github.actions.connectInstallation, {
      githubUserToken: "mallory-token",
      organizationId,
    });

    expect(await orgConnection()).toMatchObject({
      accountLogin: "new",
      installationId: "4004",
    });
  });
});

describe("selectRepository", () => {
  test("only accepts a repository the connecting GitHub user can access", async () => {
    const { insertAliceConnection, mallory, orgConnection, organizationId } =
      await setupMalloryOrg();
    await insertAliceConnection([{ fullName: "alice/shared", id: "1" }]);
    const select = (repositoryId: string, repositoryFullName: string) =>
      mallory.mutation(api.integrations.github.mutations.selectRepository, {
        defaultBranch: "main",
        organizationId,
        repositoryFullName,
        repositoryId,
      });

    await expect(select("2", "alice/secret")).rejects.toThrow(
      "Reconnect GitHub"
    );
    await expect(select("1", "alice/secret")).rejects.toThrow(
      "Reconnect GitHub"
    );
    await select("1", "alice/shared");

    expect(await orgConnection()).toMatchObject({
      repositoryFullName: "alice/shared",
      repositoryId: "1",
    });
  });

  test("rejects selection on a connection saved before access was verified", async () => {
    const { insertAliceConnection, mallory, organizationId } =
      await setupMalloryOrg();
    await insertAliceConnection();

    await expect(
      mallory.mutation(api.integrations.github.mutations.selectRepository, {
        defaultBranch: "main",
        organizationId,
        repositoryFullName: "alice/secret",
        repositoryId: "2",
      })
    ).rejects.toThrow("Reconnect GitHub");
  });
});
