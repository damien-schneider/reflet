export const SLUG_SANITIZE_REGEX = /[^a-z0-9]+/g;
export const JSON_ARRAY_REGEX = /\[[\s\S]*\]/;
export const SEMVER_TAG_REGEX = /^v?\d+\.\d+/;

export const SETUP_STEPS = [
  { key: "analyze_codebase", label: "Analyzing codebase" },
  { key: "discover_services", label: "Discovering services" },
  { key: "extract_keywords", label: "Extracting market keywords" },
  { key: "configure_changelog", label: "Configuring changelog" },
  { key: "suggest_tags", label: "Suggesting tags" },
  { key: "generate_prompts", label: "Generating AI context" },
] as const;

export function parseJsonArray<T>(text: string): T[] {
  try {
    const jsonMatch = text.match(JSON_ARRAY_REGEX);
    if (!jsonMatch) {
      return [];
    }
    const parsed: unknown = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed as T[];
  } catch {
    return [];
  }
}
