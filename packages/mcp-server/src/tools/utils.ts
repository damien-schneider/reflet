export function textResult(data: unknown): {
  content: { type: "text"; text: string }[];
} {
  return { content: [{ text: JSON.stringify(data, null, 2), type: "text" }] };
}
