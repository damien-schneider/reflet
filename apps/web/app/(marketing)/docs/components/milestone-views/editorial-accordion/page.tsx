import type { Metadata } from "next";

import { EDITORIAL_ACCORDION_CODE } from "@/components/docs/milestone-view-codes";
import { EditorialAccordionPreview } from "@/components/docs/milestone-view-previews";
import { RegistryDocPage } from "@/components/docs/registry-doc-page";
import { generatePageMetadata } from "@/lib/seo-config";

export const metadata: Metadata = generatePageMetadata({
  description:
    "A serif-typography accordion view with percentage columns and color-wash expansion.",
  path: "/docs/components/milestone-views/editorial-accordion",
  title: "Editorial accordion – milestone view",
});

const IMPORT_CODE = `import { MilestoneEditorialAccordion } from "@/components/ui/milestone-editorial-accordion";`;

const FEATURES = [
  "Each row leads with the completion percentage in a monospaced column.",
  "Milestone names and horizons are set in serif type.",
  "A thin progress bar on every row shows completion at a glance.",
  "Open a row to see a progress ring with completed and in-progress counts. One row is open at a time.",
] as const;

export default function EditorialAccordionPage() {
  return (
    <RegistryDocPage
      description="An editorial list of milestones with a percentage column. Open a row to see its progress in detail."
      features={FEATURES}
      importCode={IMPORT_CODE}
      preview={<EditorialAccordionPreview />}
      registryName="milestone-editorial-accordion"
      title="Editorial Accordion"
      usageCode={EDITORIAL_ACCORDION_CODE}
    />
  );
}
