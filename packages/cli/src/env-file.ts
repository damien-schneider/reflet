const NEEDS_QUOTES = /[\s#"'=]/;

function formatValue(value: string): string {
  return NEEDS_QUOTES.test(value) ? `"${value.replace(/"/g, '\\"')}"` : value;
}

/** Sets `key` in a dotenv file, replacing an existing uncommented entry. */
export function upsertEnvVar(
  content: string,
  key: string,
  value: string
): string {
  const declaration = `${key}=${formatValue(value)}`;
  const lines = content.split("\n");
  const existing = lines.findIndex((line) =>
    line.trimStart().startsWith(`${key}=`)
  );

  if (existing !== -1) {
    lines[existing] = declaration;
    return lines.join("\n");
  }

  const base = content && !content.endsWith("\n") ? `${content}\n` : content;
  return `${base}${declaration}\n`;
}
