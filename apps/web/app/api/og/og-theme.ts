// Brand colors from globals.css
export const BG_CREAM = "#f5f2ed";
export const TEXT_DARK = "#1a1810";
export const TEXT_MUTED = "#7a7868";
export const OLIVE_600 = "#5b5b4b";
export const OLIVE_400 = "#abab9c";
export const OLIVE_300 = "#d8d8d0";
export const OLIVE_100 = "#f4f4f0";

export function truncate(str: string, max: number): string {
  return str.length > max ? `${str.slice(0, max - 3)}...` : str;
}
