export const BG_CREAM = "#f5f2ed";
export const TEXT_DARK = "#1a1810";
export const TEXT_MUTED = "#7a7868";
export const INK_SOFT = "#5b5b4b";
export const RULE_STRONG = "#abab9c";
export const RULE = "#d8d8d0";
export const SURFACE = "#f4f4f0";
export const BRAND = "#59724b";
export const BRAND_TEXT = "#3d5530";
export const BRAND_SUBTLE = "#e2e3da";

export function truncate(str: string, max: number): string {
  return str.length > max ? `${str.slice(0, max - 3)}...` : str;
}
