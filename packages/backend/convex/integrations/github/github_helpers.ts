/**
 * Shared GitHub API helpers used by repo_analysis and project_setup
 */

interface RepoData {
  fileTree: string;
  packageJson: string | null;
  readme: string | null;
  rootContents: string;
}

const GITHUB_HEADERS = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
} as const;

const MAX_README_LENGTH = 5000;
const MAX_TREE_FILES = 100;

async function fetchRootContents(repositoryFullName: string): Promise<string> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${repositoryFullName}/contents/`,
      { headers: GITHUB_HEADERS }
    );
    if (!response.ok) {
      return "Failed to fetch root contents";
    }
    const data = await response.json();
    if (!Array.isArray(data)) {
      return "Failed to fetch root contents";
    }
    return data
      .map(
        (item: { name: string; type: string }) =>
          `${item.type === "dir" ? "[dir]" : "[file]"} ${item.name}`
      )
      .join("\n");
  } catch {
    return "Failed to fetch root contents";
  }
}

async function fetchFileTree(repositoryFullName: string): Promise<string> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${repositoryFullName}/git/trees/HEAD?recursive=1`,
      { headers: GITHUB_HEADERS }
    );
    if (!response.ok) {
      return "Failed to fetch file tree";
    }
    const data = (await response.json()) as {
      tree?: Array<{ path: string; type: string }>;
    };
    const tree = data.tree ?? [];
    const limitedTree = tree.slice(0, MAX_TREE_FILES);
    let fileTree = limitedTree
      .map((item: { path: string; type: string }) => item.path)
      .join("\n");
    if (tree.length > MAX_TREE_FILES) {
      fileTree += `\n... and ${tree.length - MAX_TREE_FILES} more files`;
    }
    return fileTree;
  } catch {
    return "Failed to fetch file tree";
  }
}

async function fetchReadme(repositoryFullName: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${repositoryFullName}/readme`,
      { headers: GITHUB_HEADERS }
    );
    if (!response.ok) {
      return null;
    }
    const data = (await response.json()) as { content?: string };
    if (!data.content) {
      return null;
    }
    const readme = Buffer.from(data.content, "base64").toString("utf-8");
    if (readme.length > MAX_README_LENGTH) {
      return `${readme.slice(0, MAX_README_LENGTH)}\n...[truncated]`;
    }
    return readme;
  } catch {
    return null;
  }
}

async function fetchPackageJson(
  repositoryFullName: string
): Promise<string | null> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${repositoryFullName}/contents/package.json`,
      { headers: GITHUB_HEADERS }
    );
    if (!response.ok) {
      return null;
    }
    const data = (await response.json()) as { content?: string };
    if (!data.content) {
      return null;
    }
    return Buffer.from(data.content, "base64").toString("utf-8");
  } catch {
    return null;
  }
}

/**
 * Fetch repository data from GitHub API (public, no auth required)
 */
export async function fetchRepoData(
  repositoryFullName: string
): Promise<RepoData> {
  const [rootContents, fileTree, readme, packageJson] = await Promise.all([
    fetchRootContents(repositoryFullName),
    fetchFileTree(repositoryFullName),
    fetchReadme(repositoryFullName),
    fetchPackageJson(repositoryFullName),
  ]);

  return { rootContents, fileTree, readme, packageJson };
}

/**
 * Fetch GitHub releases for a repository
 */
export async function fetchGitHubReleases(
  repositoryFullName: string,
  maxResults = 30
): Promise<
  Array<{
    tag_name: string;
    name: string | null;
    body: string | null;
    published_at: string | null;
    draft: boolean;
    prerelease: boolean;
  }>
> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${repositoryFullName}/releases?per_page=${maxResults}`,
      { headers: GITHUB_HEADERS }
    );
    if (!response.ok) {
      return [];
    }
    return (await response.json()) as Array<{
      tag_name: string;
      name: string | null;
      body: string | null;
      published_at: string | null;
      draft: boolean;
      prerelease: boolean;
    }>;
  } catch {
    return [];
  }
}
