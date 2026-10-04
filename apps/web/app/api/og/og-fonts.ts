import type { ImageResponse } from "next/og";

export type OgFonts = NonNullable<
  NonNullable<ConstructorParameters<typeof ImageResponse>[1]>["fonts"]
>;

const loadFont = (url: URL) => fetch(url).then((res) => res.arrayBuffer());

const switzerLight = loadFont(
  new URL("../../../fonts/switzer/Switzer-Light.ttf", import.meta.url)
);
const switzerLightItalic = loadFont(
  new URL("../../../fonts/switzer/Switzer-LightItalic.ttf", import.meta.url)
);
const switzerRegular = loadFont(
  new URL("../../../fonts/switzer/Switzer-Regular.ttf", import.meta.url)
);
const switzerSemibold = loadFont(
  new URL("../../../fonts/switzer/Switzer-Semibold.ttf", import.meta.url)
);

export async function loadOgFonts(): Promise<OgFonts> {
  const [light, lightItalic, regular, semibold] = await Promise.all([
    switzerLight,
    switzerLightItalic,
    switzerRegular,
    switzerSemibold,
  ]);
  return [
    { data: light, name: "Switzer", style: "normal", weight: 300 },
    { data: lightItalic, name: "Switzer", style: "italic", weight: 300 },
    { data: regular, name: "Switzer", style: "normal", weight: 400 },
    { data: semibold, name: "Switzer", style: "normal", weight: 600 },
  ];
}
