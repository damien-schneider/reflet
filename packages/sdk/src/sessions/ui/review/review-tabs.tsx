import type { ReactNode } from "react";
import { ViewOptionsIcon } from "../../../devtools/client/devtools-icons";
import { Menu } from "../../../devtools/client/menu";
import type { SessionDetail } from "../../protocol";
import { ImageIcon, IntentionIcon, TranscriptIcon } from "../session-icons";
import type { IntentionView } from "./proposals/proposals-tab";
import { calloutReport } from "./screens/callout-report";

export type ReviewTab = "evidence" | "proposals" | "transcript";

export interface ReviewTabsPlace {
  intentionView: IntentionView;
  selectIntentionView: (view: IntentionView) => void;
  selectTab: (tab: ReviewTab) => void;
  tab: ReviewTab;
}

interface TabOption {
  count: number | null;
  icon: ReactNode;
  label: string;
  value: ReviewTab;
}

const INTENTION_VIEWS: { label: string; value: IntentionView }[] = [
  { label: "On screen", value: "screens" },
  { label: "Details", value: "cards" },
];

function IntentionViewMenu({ place }: { place: ReviewTabsPlace }) {
  return (
    <Menu
      items={INTENTION_VIEWS.map((option) => ({
        checked: option.value === place.intentionView,
        label: option.label,
        onSelect: () => place.selectIntentionView(option.value),
      }))}
      trigger={{
        className: "icon-btn",
        content: <ViewOptionsIcon />,
        label: "Show intentions",
      }}
    />
  );
}

function tabOptions(detail: SessionDetail): TabOption[] {
  const intentionCount = detail.proposals.filter(
    (proposal) => proposal.mergedIntoId === null && proposal.attachment === null
  ).length;
  return [
    {
      count: intentionCount,
      icon: <IntentionIcon />,
      label: "Intentions",
      value: "proposals",
    },
    {
      count: null,
      icon: <TranscriptIcon />,
      label: "Transcript",
      value: "transcript",
    },
    {
      count: detail.evidence.length,
      icon: <ImageIcon />,
      label: "Screenshots",
      value: "evidence",
    },
  ];
}

export function ReviewTabs({
  detail,
  place,
}: {
  detail: SessionDetail;
  place: ReviewTabsPlace;
}) {
  const canPickView =
    place.tab === "proposals" && calloutReport(detail).screens.length > 0;
  return (
    <div className="dt-toolbar">
      <div className="dt-tabs" role="tablist">
        {tabOptions(detail).map((option) => (
          <button
            aria-selected={option.value === place.tab}
            className="dt-tab"
            key={option.value}
            onClick={() => place.selectTab(option.value)}
            role="tab"
            type="button"
          >
            {option.icon}
            {option.label}
            {option.count !== null && (
              <span className="dt-tab-count">{option.count}</span>
            )}
          </button>
        ))}
      </div>
      {canPickView && <IntentionViewMenu place={place} />}
    </div>
  );
}
