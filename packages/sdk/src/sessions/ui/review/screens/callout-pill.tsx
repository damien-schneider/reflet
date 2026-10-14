import type { CSSProperties, ReactNode, Ref } from "react";
import { CheckIcon, CloseIcon } from "../../../../feedback/ui/icons";
import type { ProposalDecision } from "../../../protocol";
import type { ProposalContext } from "../proposals/proposal-details";
import type { Callout } from "./callout-report";

const TOGGLES: {
  decision: ProposalDecision;
  icon: ReactNode;
  verb: string;
}[] = [
  { decision: "kept", icon: <CheckIcon size={13} />, verb: "Confirm" },
  { decision: "dismissed", icon: <CloseIcon />, verb: "Dismiss" },
];

export function CalloutPill({
  callout,
  context,
  pillRef,
  style,
}: {
  callout: Callout;
  context: ProposalContext;
  pillRef?: Ref<HTMLLIElement>;
  style?: CSSProperties;
}) {
  const { label, number, proposal } = callout;
  return (
    <li
      className="dt-ses-callout"
      data-decision={proposal.decision}
      ref={pillRef}
      style={style}
    >
      <span className="dt-ses-callout-number">{number}</span>
      <button
        className="dt-ses-callout-label"
        onClick={() => context.navigation.onOpenIntention(proposal.id)}
        title={proposal.need}
        type="button"
      >
        {label}
      </button>
      {context.canEdit &&
        TOGGLES.map(({ decision, icon, verb }) => {
          const isOn = proposal.decision === decision;
          return (
            <button
              aria-disabled={isOn}
              aria-label={`${verb} “${label}”`}
              aria-pressed={isOn}
              className="dt-ses-callout-btn"
              data-decision={decision}
              key={decision}
              onClick={() => {
                if (!isOn) {
                  context.actions.decide(proposal, decision);
                }
              }}
              title={verb}
              type="button"
            >
              {icon}
            </button>
          );
        })}
    </li>
  );
}
