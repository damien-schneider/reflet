import { existsSync } from "node:fs";
import { mkdir, rename, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

// Switzer's license (ITF FFL) allows self-hosting but forbids redistributing it
// through a public repository, so the files are fetched at dev/build time and gitignored.
const FONTSHARE_CSS_URL =
  "https://api.fontshare.com/v2/css?f[]=switzer@1,2,300,301,400,600&display=swap";
const FONT_DIRECTORY = fileURLToPath(
  new URL("../fonts/switzer/", import.meta.url)
);
const FONT_FACE_PATTERN = /@font-face\s*{([^}]*)}/g;

interface FontFile {
  fileName: string;
  format: "truetype" | "woff2";
  style: "italic" | "normal";
  weight: string;
}

const FONT_FILES: FontFile[] = [
  {
    fileName: "Switzer-Variable.woff2",
    format: "woff2",
    style: "normal",
    weight: "100 900",
  },
  {
    fileName: "Switzer-VariableItalic.woff2",
    format: "woff2",
    style: "italic",
    weight: "100 900",
  },
  {
    fileName: "Switzer-Light.ttf",
    format: "truetype",
    style: "normal",
    weight: "300",
  },
  {
    fileName: "Switzer-LightItalic.ttf",
    format: "truetype",
    style: "italic",
    weight: "300",
  },
  {
    fileName: "Switzer-Regular.ttf",
    format: "truetype",
    style: "normal",
    weight: "400",
  },
  {
    fileName: "Switzer-Semibold.ttf",
    format: "truetype",
    style: "normal",
    weight: "600",
  },
];

function readDeclaration(fontFace: string, property: string) {
  return new RegExp(`${property}:\\s*([^;]+);`).exec(fontFace)?.[1]?.trim();
}

function findSourceUrl(
  fontFaces: string[],
  { format, style, weight }: FontFile
) {
  const fontFace = fontFaces.find(
    (candidate) =>
      readDeclaration(candidate, "font-weight") === weight &&
      readDeclaration(candidate, "font-style") === style
  );
  const relativeUrl = fontFace
    ? new RegExp(`url\\('([^']+)'\\) format\\('${format}'\\)`).exec(
        fontFace
      )?.[1]
    : undefined;
  if (!relativeUrl) {
    throw new Error(
      `Fontshare CSS has no ${format} file for Switzer ${weight} ${style}`
    );
  }
  return new URL(relativeUrl, "https://cdn.fontshare.com").toString();
}

async function fetchOk(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`GET ${url} failed with ${response.status}`);
  }
  return response;
}

const missingFiles = FONT_FILES.filter(
  ({ fileName }) => !existsSync(`${FONT_DIRECTORY}${fileName}`)
);

if (missingFiles.length > 0) {
  const css = await (await fetchOk(FONTSHARE_CSS_URL)).text();
  const fontFaces = [...css.matchAll(FONT_FACE_PATTERN)].map(
    ([, body]) => body ?? ""
  );
  await mkdir(FONT_DIRECTORY, { recursive: true });
  await Promise.all(
    missingFiles.map(async (fontFile) => {
      const response = await fetchOk(findSourceUrl(fontFaces, fontFile));
      const destination = `${FONT_DIRECTORY}${fontFile.fileName}`;
      await writeFile(
        `${destination}.partial`,
        new Uint8Array(await response.arrayBuffer())
      );
      await rename(`${destination}.partial`, destination);
    })
  );
  console.info(
    `Fetched ${missingFiles.length} Switzer font files from Fontshare`
  );
}
