import { githubApiHeaders } from "./github_constants";

const NEXT_PAGE_LINK_REGEX = /<([^>]+)>;\s*rel="next"/;

export async function fetchAllPages<Item>(
  firstPageUrl: string,
  token: string,
  readPageItems: (page: unknown) => Item[]
): Promise<Item[]> {
  const items: Item[] = [];
  let pageUrl: string | undefined = firstPageUrl;

  while (pageUrl) {
    const response: Response = await fetch(pageUrl, {
      headers: githubApiHeaders(token),
    });
    if (!response.ok) {
      throw new Error(`GitHub request failed with status ${response.status}`);
    }
    pageUrl = response.headers.get("Link")?.match(NEXT_PAGE_LINK_REGEX)?.[1];
    items.push(...readPageItems(await response.json()));
  }

  return items;
}
