import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ReactNode } from "react";

import { InlineCode } from "@/components/ui/typography";
import { CodeBlock } from "./code-block";
import { ComponentPreview, InstallTabs } from "./component-preview";
import { DocsList, DocsPage, DocsSection, DocsText } from "./docs-page";
import { type PropDefinition, PropsTable } from "./props-table";

const SECTIONS = [
  { id: "preview", label: "Preview" },
  { id: "installation", label: "Installation" },
  { id: "usage", label: "Usage" },
  { id: "features", label: "Features" },
  { id: "api-reference", label: "API reference" },
] as const;

interface Subcomponent {
  description: string;
  name: string;
  props?: readonly PropDefinition[];
}

interface RegistryDocPageProps {
  description: string;
  features: readonly string[];
  importCode: string;
  preview: ReactNode;
  /** Registry item name; also the source file name in packages/ui/registry. */
  registryName: string;
  subcomponents?: readonly Subcomponent[];
  title: string;
  usageCode: string;
}

function readRegistrySource(registryName: string) {
  return readFileSync(
    join(process.cwd(), `../../packages/ui/registry/${registryName}.tsx`),
    "utf-8"
  );
}

function SubcomponentReference({
  subcomponents,
}: {
  subcomponents: readonly Subcomponent[];
}) {
  return (
    <div className="flex flex-col gap-8">
      {subcomponents.map((component) => (
        <div
          className="flex scroll-mt-20 flex-col gap-3"
          id={component.name}
          key={component.name}
        >
          <h3 className="font-mono font-semibold text-body text-foreground">
            <a className="hover:underline" href={`#${component.name}`}>
              {component.name}
            </a>
          </h3>
          <p className="text-body text-muted-foreground leading-relaxed">
            {component.description}
          </p>
          {component.props && component.props.length > 0 && (
            <PropsTable props={component.props} />
          )}
        </div>
      ))}
    </div>
  );
}

function RegistryDocPage({
  description,
  features,
  importCode,
  preview,
  registryName,
  subcomponents,
  title,
  usageCode,
}: RegistryDocPageProps) {
  const sections = subcomponents
    ? SECTIONS
    : SECTIONS.filter((section) => section.id !== "api-reference");

  return (
    <DocsPage description={description} sections={sections} title={title}>
      <DocsSection id="preview" sections={sections}>
        <ComponentPreview code={`${importCode}\n\n${usageCode}`}>
          {preview}
        </ComponentPreview>
      </DocsSection>

      <DocsSection id="installation" sections={sections}>
        <InstallTabs
          cliCommand={`npx shadcn add https://www.reflet.app/r/${registryName}.json`}
          manualCode={readRegistrySource(registryName)}
        />
      </DocsSection>

      <DocsSection id="usage" sections={sections}>
        <CodeBlock code={importCode} />
        <CodeBlock code={usageCode} />
      </DocsSection>

      <DocsSection id="features" sections={sections}>
        <DocsList>
          {features.map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
        </DocsList>
      </DocsSection>

      {subcomponents && (
        <DocsSection id="api-reference" sections={sections}>
          <SubcomponentReference subcomponents={subcomponents} />
          <DocsText>
            Every subcomponent also accepts <InlineCode>className</InlineCode>,
            merged with its default classes.
          </DocsText>
        </DocsSection>
      )}
    </DocsPage>
  );
}

export type { Subcomponent };
export { RegistryDocPage };
