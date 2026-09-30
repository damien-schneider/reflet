import { DocsSection, type DocsSections } from "@/components/docs/docs-page";
import { EndpointGroup } from "./endpoint";
import {
  FEEDBACK_READ_ENDPOINTS,
  ROADMAP_CHANGELOG_ENDPOINTS,
} from "./feedback-endpoints";
import {
  FEEDBACK_WRITE_ENDPOINTS,
  SCREENSHOT_ENDPOINTS,
} from "./feedback-write-endpoints";
import { SURVEY_ENDPOINTS } from "./survey-endpoints";

export function EndpointsSection({ sections }: { sections: DocsSections }) {
  return (
    <DocsSection id="endpoints" sections={sections}>
      <div className="flex flex-col gap-14">
        <EndpointGroup
          endpoints={FEEDBACK_READ_ENDPOINTS}
          title="Read feedback"
        />
        <EndpointGroup
          endpoints={FEEDBACK_WRITE_ENDPOINTS}
          title="Write feedback"
        />
        <EndpointGroup endpoints={SCREENSHOT_ENDPOINTS} title="Screenshots" />
        <EndpointGroup
          endpoints={ROADMAP_CHANGELOG_ENDPOINTS}
          title="Roadmap and changelog"
        />
        <EndpointGroup endpoints={SURVEY_ENDPOINTS} title="Surveys" />
      </div>
    </DocsSection>
  );
}
