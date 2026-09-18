export function prefersMarkdown(accept: string | null): boolean {
  const preferences = new Map<string, number>();
  for (const range of (accept ?? "").toLowerCase().split(",")) {
    const [mediaType, ...parameters] = range.trim().split(";");
    const qualityParameter = parameters.find((parameter) =>
      parameter.trim().startsWith("q=")
    );
    const quality =
      qualityParameter === undefined
        ? 1
        : Number(qualityParameter.trim().slice(2));
    if (mediaType && Number.isFinite(quality) && quality >= 0 && quality <= 1) {
      preferences.set(mediaType.trim(), quality);
    }
  }
  const markdownQuality = preferences.get("text/markdown") ?? 0;
  const htmlQuality =
    preferences.get("text/html") ??
    preferences.get("text/*") ??
    preferences.get("*/*") ??
    0;
  return markdownQuality > 0 && markdownQuality >= htmlQuality;
}
