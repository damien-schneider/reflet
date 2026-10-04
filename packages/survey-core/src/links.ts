const RELATIVE_LINK_BASE = "https://relative.invalid";

/** Only http(s) or relative links reach a button href: survey content is rendered on customer sites. */
export const safeLinkUrl = (url: string | undefined): string | null => {
  if (!url) {
    return null;
  }
  try {
    const { protocol } = new URL(url, RELATIVE_LINK_BASE);
    return protocol === "http:" || protocol === "https:" ? url : null;
  } catch {
    return null;
  }
};
