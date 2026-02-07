"use client";

import {
  Brain,
  Code,
  GithubLogo,
  LightbulbFilament,
  TreeStructure,
} from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Text } from "@/components/ui/typography";

interface GitHubConnectionPromptProps {
  isAdmin: boolean;
  onConnect: () => void;
}

const BENEFITS = [
  {
    icon: Brain,
    title: "AI-Powered Repository Analysis",
    description:
      "Automatically analyze your codebase structure, tech stack, and architecture",
  },
  {
    icon: LightbulbFilament,
    title: "Smarter Feedback Understanding",
    description:
      "AI uses repo context to better understand and categorize user feedback",
  },
  {
    icon: Code,
    title: "Better Coding Prompts",
    description:
      "Generate context-aware prompts tailored to your project's tech stack",
  },
  {
    icon: TreeStructure,
    title: "Repository Structure Insights",
    description:
      "Visualize and understand your project's architecture at a glance",
  },
] as const;

export function GitHubConnectionPrompt({
  isAdmin,
  onConnect,
}: GitHubConnectionPromptProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GithubLogo className="h-5 w-5" />
          Connect GitHub to Enhance AI
        </CardTitle>
        <Text variant="bodySmall">
          Link your GitHub repository to unlock AI-powered analysis and smarter
          feedback understanding.
        </Text>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          {BENEFITS.map((benefit) => (
            <div className="flex gap-3" key={benefit.title}>
              <benefit.icon className="mt-0.5 h-5 w-5 shrink-0 text-olive-600" />
              <div>
                <Text className="font-medium text-sm">{benefit.title}</Text>
                <Text className="text-muted-foreground text-xs">
                  {benefit.description}
                </Text>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter>
        {isAdmin ? (
          <Button onClick={onConnect}>
            <GithubLogo className="mr-2 h-4 w-4" />
            Connect GitHub
          </Button>
        ) : (
          <Text className="text-muted-foreground" variant="bodySmall">
            Contact an admin to connect GitHub.
          </Text>
        )}
      </CardFooter>
    </Card>
  );
}
