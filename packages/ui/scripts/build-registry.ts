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

interface RegistryFile {
  content: string;
  path: string;
  target?: string;
  type: "registry:ui";
}

interface RegistryItem {
  $schema: string;
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
