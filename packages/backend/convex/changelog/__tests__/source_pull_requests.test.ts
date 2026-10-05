import { afterEach, expect, test, vi } from "vitest";
import { fetchPullRequestsBestEffort } from "../source_pull_requests";

const COMMITS = [
  {
    author: "dev",
    date: "2026-01-01T00:00:00Z",
    fullMessage: "feat: search",
    message: "feat: search",
    sha: "a".repeat(40),
  },
];

const respondWith = (response: Response) => {
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => response)
  );
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

test.each([
  ["a rate-limited request", new Response("limited", { status: 403 })],
  [
    "a query error without data",
    Response.json({ errors: [{ message: "Something went wrong" }] }),
  ],
  [
    "a commit whose pull requests the app cannot read",
    Response.json({
      data: { repository: { c0: { associatedPullRequests: null } } },
      errors: [{ message: "Resource not accessible by integration" }],
    }),
  ],
])(
  "%s yields no pull requests instead of failing generation",
  async (_case, response) => {
    respondWith(response);

    await expect(
      fetchPullRequestsBestEffort("token", "acme/app", COMMITS)
    ).resolves.toEqual([]);
  }
);

test("pull requests from readable commits survive errors on other commits", async () => {
  respondWith(
    Response.json({
      data: {
        repository: {
          c0: {
            associatedPullRequests: {
              nodes: [
                {
                  body: "Faster search",
                  number: 7,
                  title: "Speed up search",
                  url: "https://github.com/acme/app/pull/7",
                },
              ],
            },
          },
          c1: null,
        },
      },
      errors: [{ message: "Could not resolve to a node" }],
    })
  );

  await expect(
    fetchPullRequestsBestEffort("token", "acme/app", COMMITS)
  ).resolves.toEqual([
    {
      body: "Faster search",
      number: 7,
      title: "Speed up search",
      url: "https://github.com/acme/app/pull/7",
    },
  ]);
});
