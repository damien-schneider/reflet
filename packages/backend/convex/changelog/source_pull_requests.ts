import { z } from "zod";
import { GITHUB_API_URL } from "./retroactive_pipeline/github";
import { MAX_SOURCE_PULL_REQUESTS } from "./source";
import type { ReleaseCommit, ReleasePullRequest } from "./tableFields";

const MAX_PULL_REQUEST_BODY_LENGTH = 2000;
const PULL_REQUESTS_PER_COMMIT = 5;

const pullRequestNodeSchema = z.object({
  body: z.string().nullable(),
  number: z.number(),
  title: z.string(),
  url: z.string(),
});

const pullRequestResponseSchema = z.object({
  data: z
    .object({
      repository: z
        .record(
          z.string(),
          z
            .object({
              associatedPullRequests: z
                .object({ nodes: z.array(pullRequestNodeSchema.nullable()) })
                .nullish(),
            })
            .nullish()
        )
        .nullish(),
    })
    .nullish(),
  errors: z.array(z.object({ message: z.string() })).optional(),
});

function buildPullRequestQuery(commits: ReleaseCommit[]): string {
  const commitFields = commits
    .map(
      (commit, index) =>
        `c${index}: object(oid: "${commit.sha}") { ... on Commit { associatedPullRequests(first: ${PULL_REQUESTS_PER_COMMIT}) { nodes { number title body url } } } }`
    )
    .join("\n");
  return `query($owner: String!, $name: String!) { repository(owner: $owner, name: $name) { ${commitFields} } }`;
}

export async function fetchPullRequestsBestEffort(
  token: string,
  repoFullName: string,
  commits: ReleaseCommit[]
): Promise<ReleasePullRequest[]> {
  if (commits.length === 0) {
    return [];
  }
  const [owner, name] = repoFullName.split("/");
  const response = await fetch(`${GITHUB_API_URL}/graphql`, {
    body: JSON.stringify({
      query: buildPullRequestQuery(commits),
      variables: { name, owner },
    }),
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  if (!response.ok) {
    console.warn(
      `Skipping pull requests: GitHub GraphQL ${response.status} ${response.statusText}`
    );
    return [];
  }
  const parsed = pullRequestResponseSchema.safeParse(await response.json());
  if (!parsed.success) {
    console.warn(
      `Skipping pull requests: unexpected GraphQL shape ${parsed.error.message}`
    );
    return [];
  }
  const { data, errors } = parsed.data;
  if (errors?.length) {
    console.warn(
      `GitHub GraphQL pull request errors: ${errors.map((error) => error.message).join("; ")}`
    );
  }

  const byNumber = new Map<number, ReleasePullRequest>();
  for (const commitNode of Object.values(data?.repository ?? {})) {
    for (const pullRequest of commitNode?.associatedPullRequests?.nodes ?? []) {
      if (!pullRequest || byNumber.has(pullRequest.number)) {
        continue;
      }
      byNumber.set(pullRequest.number, {
        body: pullRequest.body
          ? pullRequest.body.slice(0, MAX_PULL_REQUEST_BODY_LENGTH)
          : undefined,
        number: pullRequest.number,
        title: pullRequest.title,
        url: pullRequest.url,
      });
    }
  }
  return [...byNumber.values()].slice(0, MAX_SOURCE_PULL_REQUESTS);
}
