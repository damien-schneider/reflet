"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@ctrl-ui/react/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ctrl-ui/react/ui/tooltip";
import {
  ArrowUpRight,
  CaretDown,
  Check,
  Code,
  Terminal,
} from "@phosphor-icons/react";
import type { ReactNode } from "react";
import type { AgentTarget } from "./agent-config";

interface ItemIconProps {
  copied: boolean;
  icon: ReactNode;
}

function ItemIcon({ copied, icon }: ItemIconProps) {
  return (
    <span className="mr-2 flex h-4 w-4 items-center justify-center">
      {copied ? <Check className="h-4 w-4 text-success-text" /> : icon}
    </span>
  );
}

interface ItemTextProps {
  description: ReactNode;
  grow?: boolean;
  label: ReactNode;
}

function ItemText({ description, grow, label }: ItemTextProps) {
  return (
    <div className={grow ? "flex flex-1 flex-col" : "flex flex-col"}>
      <span>{label}</span>
      <span className="text-muted-foreground text-xs">{description}</span>
    </div>
  );
}

export function AgentsMenuTrigger() {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <DropdownMenuTrigger
            render={
              <Button
                className="h-8 gap-1.5 px-2.5"
                size="xs"
                variant="surface"
              />
            }
          />
        }
      >
        <Terminal className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Agents</span>
        <CaretDown className="h-3 w-3 opacity-50" />
      </TooltipTrigger>
      <TooltipContent>Copy prompt for AI coding agents</TooltipContent>
    </Tooltip>
  );
}

interface CopyItemSectionProps {
  copied: boolean;
  onCopy: () => void;
}

export function QueueCommandSection({ copied, onCopy }: CopyItemSectionProps) {
  return (
    <DropdownMenuGroup>
      <DropdownMenuLabel>Work it end to end</DropdownMenuLabel>
      <DropdownMenuItem onClick={onCopy}>
        <ItemIcon copied={copied} icon={<Terminal className="h-4 w-4" />} />
        <ItemText
          description="Claim, fix, open the PR and close it"
          label="/reflet <id>"
        />
      </DropdownMenuItem>
    </DropdownMenuGroup>
  );
}

export function CodingPromptSection({ copied, onCopy }: CopyItemSectionProps) {
  return (
    <>
      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        <DropdownMenuItem onClick={onCopy}>
          <ItemIcon copied={copied} icon={<Code className="h-4 w-4" />} />
          <ItemText
            description="Includes AI clarification"
            label="Coding prompt"
          />
        </DropdownMenuItem>
      </DropdownMenuGroup>
    </>
  );
}

interface AgentListProps {
  agents: AgentTarget[];
  copiedId: string | null;
  onAction: (agent: AgentTarget) => void;
}

export function CopyAgentsSection({
  agents,
  copiedId,
  onAction,
}: AgentListProps) {
  return (
    <DropdownMenuGroup>
      <DropdownMenuLabel>Copy for agents</DropdownMenuLabel>
      {agents.map((agent) => (
        <DropdownMenuItem key={agent.id} onClick={() => onAction(agent)}>
          <ItemIcon copied={copiedId === agent.id} icon={agent.icon} />
          <ItemText description={agent.description} label={agent.label} />
        </DropdownMenuItem>
      ))}
    </DropdownMenuGroup>
  );
}

interface ExternalAgentsSectionProps extends AgentListProps {
  label: string;
}

export function ExternalAgentsSection({
  agents,
  copiedId,
  label,
  onAction,
}: ExternalAgentsSectionProps) {
  if (agents.length === 0) {
    return null;
  }
  return (
    <>
      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        <DropdownMenuLabel className="text-xs">{label}</DropdownMenuLabel>
        {agents.map((agent) => (
          <DropdownMenuItem key={agent.id} onClick={() => onAction(agent)}>
            <ItemIcon copied={copiedId === agent.id} icon={agent.icon} />
            <ItemText
              description={agent.description}
              grow
              label={agent.label}
            />
            <ArrowUpRight className="h-3 w-3 opacity-50" />
          </DropdownMenuItem>
        ))}
      </DropdownMenuGroup>
    </>
  );
}
