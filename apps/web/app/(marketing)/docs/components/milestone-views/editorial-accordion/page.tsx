import type { Metadata } from "next";
import { EditorialAccordionPreview } from "@/components/docs/milestone-view-previews";
import { RegistryDocPage } from "@/components/docs/registry-doc-page";
import { generatePageMetadata } from "@/lib/seo-config";

export const metadata: Metadata = generatePageMetadata({
  description:
    "Install a milestone accordion with supplied percentages and expandable completion details.",
  path: "/docs/components/milestone-views/editorial-accordion",
  title: "Editorial accordion",
});
const IMPORT_CODE = `import {
  MilestoneEditorialAccordion,
  type Milestone,
} from "@/components/ui/milestone-editorial-accordion";`;
const USAGE = `const milestones: Milestone[] = [
  {
    id: "keyboard",
    name: "Keyboard navigation",
    emoji: "",
    colorHex: "#0b6e99",
    horizonLabel: "This quarter",
    horizonShort: "3mo",
    targetDate: "December 15",
    progress: { total: 8, completed: 4, inProgress: 2, percentage: 50 },
  },
];

export function Roadmap() {
  return <MilestoneEditorialAccordion milestones={milestones} />;
}`;
const FEATURES = [
  "Rows show the supplied percentage, name, horizonLabel, optional targetDate and progress bar.",
  "Expanded details show a progress ring and completed/total/inProgress counts.",
  "horizonShort is required by the shared type but unused by this view.",
] as const;

export default function EditorialAccordionPage() {
  return (
    <RegistryDocPage
      description="A milestone list with percentages and expandable count details. Dates, counts and progress come from your app."
      features={FEATURES}
      importCode={IMPORT_CODE}
      preview={<EditorialAccordionPreview />}
      registryName="milestone-editorial-accordion"
      subcomponents={[
        {
          description:
            "Client component with internal open-row state. Exports MilestoneEditorialAccordionProps and Milestone types.",
          name: "MilestoneEditorialAccordion",
          props: [
            {
              description:
                "Display-ready data with unique ids. See the milestone views overview for the full contract.",
              name: "milestones",
              required: true,
              type: "Milestone[]",
            },
            {
              description: "Classes merged onto the outer list wrapper.",
              name: "className",
              type: "string",
            },
          ],
        },
      ]}
      title="Editorial accordion"
      usageCode={USAGE}
    />
  );
}
