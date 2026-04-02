// Brand colors from globals.css
export const BG_CREAM = "#f5f2ed";
export const TEXT_DARK = "#1a1810";
export const TEXT_MUTED = "#7a7868";
export const OLIVE_600 = "#5b5b4b";
export const OLIVE_400 = "#abab9c";
export const OLIVE_300 = "#d8d8d0";
export const OLIVE_100 = "#f4f4f0";

// Load brand fonts (TTF files co-located with this route)
export const instrumentSerifRegular = fetch(
  new URL("./InstrumentSerif-Regular.ttf", import.meta.url)
).then((res) => res.arrayBuffer());

export const instrumentSerifItalic = fetch(
  new URL("./InstrumentSerif-Italic.ttf", import.meta.url)
).then((res) => res.arrayBuffer());

export const interRegular = fetch(
  new URL("./Inter-Regular.ttf", import.meta.url)
).then((res) => res.arrayBuffer());

export const interSemiBold = fetch(
  new URL("./Inter-SemiBold.ttf", import.meta.url)
).then((res) => res.arrayBuffer());

export function truncate(str: string, max: number): string {
  return str.length > max ? `${str.slice(0, max - 3)}...` : str;
}
