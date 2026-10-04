export const GITHUB_API_URL = "https://api.github.com";

export const GITHUB_PUBLIC_HEADERS = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
} as const;

export function githubApiHeaders(token: string): Record<string, string> {
  return {
    ...GITHUB_PUBLIC_HEADERS,
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}
