const HTML_ESCAPES: Record<string, string> = {
  "'": "&#39;",
  '"': "&quot;",
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
};
const HTML_SPECIAL_CHARACTERS = /[&<>"']/g;

const escapeHtml = (text: string): string =>
  text.replace(
    HTML_SPECIAL_CHARACTERS,
    (character) => HTML_ESCAPES[character] ?? character
  );

export function htmlPage(
  title: string,
  message: string,
  status: number
): Response {
  const safeTitle = escapeHtml(title);
  const body = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${safeTitle} · Reflet devtools</title></head>
<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;background:#fafafa;color:#18181b">
<main style="max-width:28rem;padding:1.5rem">
<h1 style="font-size:1.25rem;margin:0 0 .5rem">${safeTitle}</h1>
<p style="margin:0;line-height:1.5;color:#52525b">${escapeHtml(message)}</p>
</main>
</body>
</html>
`;
  return new Response(body, {
    headers: {
      "cache-control": "no-store",
      "content-security-policy":
        "default-src 'none'; style-src 'unsafe-inline'",
      "content-type": "text/html; charset=utf-8",
      "referrer-policy": "no-referrer",
      "x-content-type-options": "nosniff",
    },
    status,
  });
}
