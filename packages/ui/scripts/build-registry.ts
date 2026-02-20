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
  path: string;
  content: string;
  type: "registry:ui";
  target?: string;
}

interface RegistryItem {
  $schema: string;
  name: string;
  type: "registry:ui";
  title: string;
  description: string;
  dependencies: string[];
  registryDependencies: string[];
  files: RegistryFile[];
  meta: {
    importSpecifier: string;
  };
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
    name: "feedback-sweep-corner",
    file: "feedback-sweep-corner.tsx",
    title: "Feedback Sweep Corner",
    description:
      "Feedback card with a corner vote badge and sweep animation effect on click.",
    dependencies: ["motion", "@phosphor-icons/react", "clsx", "tailwind-merge"],
    registryDependencies: [],
  },
  {
    name: "feedback-minimal-notch",
    file: "feedback-minimal-notch.tsx",
    title: "Feedback Minimal Notch",
    description: "Minimal feedback card with a left-edge notch vote indicator.",
    dependencies: ["motion", "@phosphor-icons/react", "clsx", "tailwind-merge"],
    registryDependencies: [],
  },
  {
    name: "feedback-editorial-feed",
    file: "feedback-editorial-feed.tsx",
    title: "Feedback Editorial Feed",
    description:
      "Rich editorial layout with margin vote annotations and stacked list items.",
    dependencies: ["motion", "@phosphor-icons/react", "clsx", "tailwind-merge"],
    registryDependencies: [],
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
      name: component.name,
      type: "registry:ui",
      title: component.title,
      description: component.description,
      dependencies: component.dependencies,
      registryDependencies: component.registryDependencies,
      files: [
        {
          path: `ui/${component.file}`,
          content: source,
          type: "registry:ui",
          target: `components/ui/${component.file}`,
        },
      ],
      meta: {
        importSpecifier: `@/components/ui/${component.name}`,
      },
    };

    const outPath = resolve(OUTPUT_DIR, `${component.name}.json`);
    writeFileSync(outPath, JSON.stringify(registryItem, null, 2));
    console.log(`[ok] ${component.name}.json`);
    built++;
  }

  console.log(
    `\nBuilt ${built}/${COMPONENTS.length} registry items → ${OUTPUT_DIR}`
  );
}

build();
