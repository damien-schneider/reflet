"use client";

import { Desktop, Moon, Sun } from "@phosphor-icons/react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const themes = ["system", "light", "dark"] as const;
export type Theme = (typeof themes)[number];

export const themeIcons: Record<
  Theme,
  React.ComponentType<{ className?: string }>
> = {
  system: Desktop,
  light: Sun,
  dark: Moon,
};

export const themeLabels: Record<Theme, string> = {
  system: "System",
  light: "Light",
  dark: "Dark",
};

export function useThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const cycleTheme = () => {
    const currentIndex = themes.indexOf(theme as Theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  const currentTheme = ((mounted ? theme : undefined) as Theme) ?? "system";
  const Icon = themeIcons[currentTheme];
  const label = themeLabels[currentTheme];

  return { mounted, cycleTheme, setTheme, currentTheme, Icon, label };
}

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const cycleTheme = () => {
    const currentIndex = themes.indexOf(theme as Theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <Button
        className={cn("h-8 w-8", className)}
        disabled
        size="icon"
        variant="ghost"
      >
        <Desktop className="h-4 w-4" />
        <span className="sr-only">Toggle theme</span>
      </Button>
    );
  }

  const currentTheme = (theme as Theme) ?? "system";
  const Icon = themeIcons[currentTheme];

  return (
    <Button
      className={cn("h-8 w-8", className)}
      onClick={cycleTheme}
      size="icon"
      title={`Theme: ${themeLabels[currentTheme]}`}
      variant="ghost"
    >
      <Icon className="h-4 w-4" />
      <span className="sr-only">
        Theme: {themeLabels[currentTheme]}. Click to change.
      </span>
    </Button>
  );
}

export function ThemeToggleWithLabel({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const cycleTheme = () => {
    const currentIndex = themes.indexOf(theme as Theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  if (!mounted) {
    return (
      <Button
        className={cn("h-8 w-full justify-start gap-2 px-2", className)}
        disabled
        variant="ghost"
      >
        <Desktop className="h-4 w-4" />
        <span className="text-sm">System</span>
      </Button>
    );
  }

  const currentTheme = (theme as Theme) ?? "system";
  const Icon = themeIcons[currentTheme];

  return (
    <Button
      className={cn("h-8 w-full justify-start gap-2 px-2", className)}
      onClick={cycleTheme}
      variant="ghost"
    >
      <Icon className="h-4 w-4" />
      <span className="text-sm">{themeLabels[currentTheme]}</span>
    </Button>
  );
}
