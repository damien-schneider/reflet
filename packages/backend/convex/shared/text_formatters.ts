/**
 * Strip all HTML tags from a string, returning plain text.
 */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}
