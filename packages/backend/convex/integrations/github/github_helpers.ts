import { z } from "zod";
import { GITHUB_API_URL, GITHUB_PUBLIC_HEADERS } from "./github_constants";
import { githubApiReleaseSchema } from "./github_release_payload";

interface RepoData {
  fileTree: string;
  packageJson: string | null;
  readme: string | null;
  rootContents: string;
}

const MAX_README_LENGTH = 5000;
const MAX_TREE_FILES = 100;

const fileTreeSchema = z.object({
  tree: z.array(z.object({ path: z.string() })).optional(),
});

const base64ContentSchema = z.object({ content: z.string().optional() });

async function fetchRootContents(repositoryFullName: string): Promise<string> {
  try {
    const response = await fetch(
      `${GITHUB_API_URL}/repos/${repositoryFullName}/contents/`,
      { headers: GITHUB_PUBLIC_HEADERS }
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
      `${GITHUB_API_URL}/repos/${repositoryFullName}/git/trees/HEAD?recursive=1`,
      { headers: GITHUB_PUBLIC_HEADERS }
    );
    if (!response.ok) {
      return "Failed to fetch file tree";
    }
    const { tree = [] } = fileTreeSchema.parse(await response.json());
    let fileTree = tree
      .slice(0, MAX_TREE_FILES)
      .map((item) => item.path)
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
      `${GITHUB_API_URL}/repos/${repositoryFullName}/readme`,
      { headers: GITHUB_PUBLIC_HEADERS }
    );
    if (!response.ok) {
      return null;
    }
    const { content } = base64ContentSchema.parse(await response.json());
    if (!content) {
      return null;
    }
    const readme = Buffer.from(content, "base64").toString("utf-8");
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
      `${GITHUB_API_URL}/repos/${repositoryFullName}/contents/package.json`,
      { headers: GITHUB_PUBLIC_HEADERS }
    );
    if (!response.ok) {
      return null;
    }
    const { content } = base64ContentSchema.parse(await response.json());
    if (!content) {
      return null;
    }
    return Buffer.from(content, "base64").toString("utf-8");
  } catch {
    return null;
  }
}

export async function fetchRepoData(
  repositoryFullName: string
): Promise<RepoData> {
  const [rootContents, fileTree, readme, packageJson] = await Promise.all([
    fetchRootContents(repositoryFullName),
    fetchFileTree(repositoryFullName),
    fetchReadme(repositoryFullName),
    fetchPackageJson(repositoryFullName),
  ]);

  return { fileTree, packageJson, readme, rootContents };
}

export async function fetchGitHubReleases(
  repositoryFullName: string,
  maxResults = 30
): Promise<z.infer<typeof githubApiReleaseSchema>[]> {
  try {
    const response = await fetch(
      `${GITHUB_API_URL}/repos/${repositoryFullName}/releases?per_page=${maxResults}`,
      { headers: GITHUB_PUBLIC_HEADERS }
    );
    if (!response.ok) {
      return [];
    }
    return z.array(githubApiReleaseSchema).parse(await response.json());
  } catch {
    return [];
  }
}
