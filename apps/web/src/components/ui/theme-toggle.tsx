"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ctrl-ui/react/ui/tooltip";
import { Desktop, Moon, Sun } from "@phosphor-icons/react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export const themes = ["system", "light", "dark"] as const;
export type Theme = (typeof themes)[number];

export const themeIcons: Record<
  Theme,
  React.ComponentType<{ className?: string }>
> = {
  dark: Moon,
  light: Sun,
  system: Desktop,
};

export const themeLabels: Record<Theme, string> = {
  dark: "Dark",
  light: "Light",
  system: "System",
};

const isValidTheme = (value: string | undefined): value is Theme =>
  themes.some((theme) => theme === value);

const getTheme = (theme: string | undefined): Theme =>
  isValidTheme(theme) ? theme : "system";

export function useThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const cycleTheme = () => {
    const currentIndex = themes.indexOf(getTheme(theme));
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  const currentTheme = mounted ? getTheme(theme) : "system";
  const Icon = themeIcons[currentTheme];
  const label = themeLabels[currentTheme];

  return { currentTheme, cycleTheme, Icon, label, mounted, setTheme };
}

export function ThemeToggle({ className }: { className?: string }) {
  const { cycleTheme, Icon, label, mounted } = useThemeToggle();

  if (!mounted) {
    return (
      <Button
        aria-label="Toggle theme"
        className={cn("size-10", className)}
        disabled
        iconOnly
        variant="ghost"
      >
        <Desktop className="size-4" />
      </Button>
    );
  }

  const description = `Theme: ${label}. Activate to change it.`;

  return (
    <Tooltip>
      <TooltipTrigger
        aria-label={description}
        render={
          <Button
            className={cn("size-10", className)}
            iconOnly
            onClick={cycleTheme}
            variant="ghost"
          />
        }
      >
        <Icon className="size-4" />
      </TooltipTrigger>
      <TooltipContent>{description}</TooltipContent>
    </Tooltip>
  );
}

export function ThemeToggleWithLabel({ className }: { className?: string }) {
  const { cycleTheme, Icon, label, mounted } = useThemeToggle();

  return (
    <Button
      className={cn("h-10 w-full justify-start gap-2 px-2", className)}
      disabled={!mounted}
      onClick={cycleTheme}
      variant="ghost"
    >
      <Icon className="size-4" />
      <span className="text-sm">{label}</span>
    </Button>
  );
}
