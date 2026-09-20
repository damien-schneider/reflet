/**
 * Build script that generates shadcn-compatible registry JSON files
 * from source components in packages/ui/registry/.
 *
 * Output: apps/web/public/r/[name].json
 *
 * Usage: bun run scripts/build-registry.ts
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../../..");
const REGISTRY_DIR = resolve(import.meta.dirname, "../registry");
const OUTPUT_DIR = resolve(ROOT, "apps/web/public/r");
const THEME_FILE = resolve(ROOT, "apps/web/src/styles/reflet-theme.css");
const TAG_TOKEN = /^\s*--(tag-[a-z-]+):\s*([^;]+);/;

interface RegistryFile {
  content: string;
  path: string;
  target?: string;
  type: "registry:ui";
}

type TokenMap = Record<string, string>;

interface CssVars {
  dark: TokenMap;
  light: TokenMap;
  theme: TokenMap;
}

interface RegistryItem {
  $schema: string;
  cssVars: CssVars;
  dependencies: string[];
  description: string;
  files: RegistryFile[];
  meta: {
    importSpecifier: string;
  };
  name: string;
  registryDependencies: string[];
  title: string;
  type: "registry:ui";
}

function readTagTokens(): CssVars {
  const lines = readFileSync(THEME_FILE, "utf-8").split("\n");
  const light: TokenMap = {};
  const dark: TokenMap = {};

  for (const line of lines) {
    const match = TAG_TOKEN.exec(line);
    if (!(match?.[1] && match[2])) {
      continue;
    }
    const [, name, value] = match;
    const target = name in light ? dark : light;
    target[name] = value.trim();
  }

  const names = Object.keys(light);
  if (names.length === 0 || names.length !== Object.keys(dark).length) {
    throw new Error(
      `Expected matching light/dark --tag-* blocks in ${THEME_FILE}, found ${names.length} light and ${Object.keys(dark).length} dark`
    );
  }

  const theme: TokenMap = {};
  for (const name of names) {
    if (!(name in dark)) {
      throw new Error(`--${name} has a light value but no dark counterpart`);
    }
    theme[`color-${name}`] = `var(--${name})`;
  }

  return { dark, light, theme };
}

const COMPONENTS: Array<{
  name: string;
  file: string;
  title: string;
  description: string;
  dependencies: string[];
  registryDependencies: string[];
}> = [
  {
    dependencies: ["motion", "@phosphor-icons/react", "clsx", "tailwind-merge"],
    description:
      "Feedback card with a corner vote badge and sweep animation effect on click.",
    file: "feedback-sweep-corner.tsx",
    name: "feedback-sweep-corner",
    registryDependencies: [],
    title: "Feedback Sweep Corner",
  },
  {
    dependencies: ["motion", "@phosphor-icons/react", "clsx", "tailwind-merge"],
    description: "Minimal feedback card with a left-edge notch vote indicator.",
    file: "feedback-minimal-notch.tsx",
    name: "feedback-minimal-notch",
    registryDependencies: [],
    title: "Feedback Minimal Notch",
  },
  {
    dependencies: ["motion", "@phosphor-icons/react", "clsx", "tailwind-merge"],
    description:
      "Rich editorial layout with margin vote annotations and stacked list items.",
    file: "feedback-editorial-feed.tsx",
    name: "feedback-editorial-feed",
    registryDependencies: [],
    title: "Feedback Editorial Feed",
  },
  {
    dependencies: ["motion", "clsx", "tailwind-merge"],
    description: "Horizontal track grouped by time horizons.",
    file: "milestone-track-view.tsx",
    name: "milestone-track-view",
    registryDependencies: [],
    title: "Milestone Track View",
  },
  {
    dependencies: ["motion", "clsx", "tailwind-merge"],
    description:
      "Serif typography with percentage column and color-wash accordion.",
    file: "milestone-editorial-accordion.tsx",
    name: "milestone-editorial-accordion",
    registryDependencies: [],
    title: "Milestone Editorial Accordion",
  },
  {
    dependencies: ["motion", "clsx", "tailwind-merge"],
    description:
      "KPI summary bar at top with vertical timeline and sweep animation.",
    file: "milestone-dashboard-timeline.tsx",
    name: "milestone-dashboard-timeline",
    registryDependencies: [],
    title: "Milestone Dashboard Timeline",
  },
];

function build() {
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const cssVars = readTagTokens();
  let built = 0;

  for (const component of COMPONENTS) {
    const sourcePath = resolve(REGISTRY_DIR, component.file);

    if (!existsSync(sourcePath)) {
      console.warn(`[skip] ${component.file} not found`);
      continue;
    }

    const source = readFileSync(sourcePath, "utf-8");

    const registryItem: RegistryItem = {
      $schema: "https://ui.shadcn.com/schema/registry-item.json",
      cssVars,
      dependencies: component.dependencies,
      description: component.description,
      files: [
        {
          content: source,
          path: `ui/${component.file}`,
          target: `components/ui/${component.file}`,
          type: "registry:ui",
        },
      ],
      meta: {
        importSpecifier: `@/components/ui/${component.name}`,
      },
      name: component.name,
      registryDependencies: component.registryDependencies,
      title: component.title,
      type: "registry:ui",
    };

    const outPath = resolve(OUTPUT_DIR, `${component.name}.json`);
    writeFileSync(outPath, JSON.stringify(registryItem, null, 2));
    console.log(`[ok] ${component.name}.json`);
    built++;
  }

  console.log(
    `\nBuilt ${built}/${COMPONENTS.length} registry items → ${OUTPUT_DIR}`
  );

  // Write a local manifest so turbo can track outputs for caching
  const DIST_DIR = resolve(import.meta.dirname, "../dist");
  if (!existsSync(DIST_DIR)) {
    mkdirSync(DIST_DIR, { recursive: true });
  }
  writeFileSync(
    resolve(DIST_DIR, "registry-manifest.json"),
    JSON.stringify(
      COMPONENTS.map((c) => c.name),
      null,
      2
    )
  );
}

build();
