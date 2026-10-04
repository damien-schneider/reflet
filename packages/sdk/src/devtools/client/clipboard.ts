/**
 * Safari only lets a page write the clipboard inside the key press or click
 * itself, while the text waits on a source-map lookup: the write starts now
 * and the text follows.
 */
export async function copyToClipboard(text: Promise<string>): Promise<void> {
  if (!window.isSecureContext) {
    throw new Error("The clipboard needs HTTPS or localhost.");
  }
  const blob = text.then((value) => new Blob([value], { type: "text/plain" }));
  await navigator.clipboard.write([new ClipboardItem({ "text/plain": blob })]);
}
