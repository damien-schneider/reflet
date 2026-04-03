"use client";

import { BotIcon, KeyRoundIcon, RocketIcon, SettingsIcon } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { useAutopilotContext } from "@/features/autopilot/components/autopilot-context";

const STEPS = [
  {
    icon: SettingsIcon,
    title: "Configure Autopilot",
    description: "Set up your adapter and connect your repository",
  },
  {
    icon: KeyRoundIcon,
    title: "Add Credentials",
    description: "Provide API keys for your chosen coding adapter",
  },
  {
    icon: BotIcon,
    title: "Enable Agents",
    description: "Turn on the agents you want working for you",
  },
  {
    icon: RocketIcon,
    title: "Enable Autopilot",
    description: "Flip the switch and let your AI team take over",
  },
] as const;

export function SetupGate() {
  const { orgSlug } = useAutopilotContext();

  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10">
          <BotIcon className="size-6 text-primary" />
        </div>
        <h2 className="mb-2 font-semibold text-xl">Welcome to Autopilot</h2>
        <p className="mb-8 text-muted-foreground text-sm">
          Set up your autonomous AI team in a few steps. Head to Settings to get
          started.
        </p>

        <ol className="mb-8 space-y-4 text-left">
          {STEPS.map((step, index) => (
            <li className="flex items-start gap-3" key={step.title}>
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted font-medium text-muted-foreground text-xs">
                {index + 1}
              </span>
              <div>
                <p className="font-medium text-sm">{step.title}</p>
                <p className="text-muted-foreground text-xs">
                  {step.description}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <Link
          className={buttonVariants()}
          href={`/dashboard/${orgSlug}/autopilot/settings`}
        >
          <SettingsIcon className="mr-2 size-4" />
          Go to Settings
        </Link>
      </div>
    </div>
  );
}
