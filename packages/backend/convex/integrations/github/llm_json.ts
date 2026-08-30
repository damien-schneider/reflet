import type { z } from "zod";

const JSON_ARRAY_REGEX = /\[[\s\S]*\]/;

export function parseJsonArray<T>(text: string, schema: z.ZodType<T>): T[] {
  const jsonMatch = text.match(JSON_ARRAY_REGEX);
  if (!jsonMatch) {
    return [];
  }

  try {
    const rows: unknown = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(rows)) {
      return [];
    }
    return rows.flatMap((row) => {
      const parsed = schema.safeParse(row);
      return parsed.success ? [parsed.data] : [];
    });
  } catch {
    return [];
  }
}
