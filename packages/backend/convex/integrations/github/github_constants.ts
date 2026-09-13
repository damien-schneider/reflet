export const GITHUB_API_URL = "https://api.github.com";

export function githubApiHeaders(
  installationToken: string
): Record<string, string> {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${installationToken}`,
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}
