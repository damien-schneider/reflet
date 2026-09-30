"use client";

import { Button, type ButtonSize } from "@ctrl-ui/react/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ctrl-ui/react/ui/tooltip";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import {
  type Theme,
  themeIcons,
  themeLabels,
  themes,
} from "@/components/ui/theme-options";

const isValidTheme = (value: string | undefined): value is Theme =>
  themes.some((theme) => theme === value);

const getTheme = (theme: string | undefined): Theme =>
  isValidTheme(theme) ? theme : "system";

const subscribeToNothing = () => () => undefined;

export function useThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false
  );

  const currentTheme = mounted ? getTheme(theme) : "system";
  const nextTheme = themes[(themes.indexOf(currentTheme) + 1) % themes.length];

  return {
    currentTheme,
    cycleTheme: () => setTheme(nextTheme),
    Icon: themeIcons[currentTheme],
    label: mounted ? themeLabels[currentTheme] : "",
    mounted,
    nextLabel: themeLabels[nextTheme],
    setTheme,
  };
}

export function ThemeToggle({
  className,
  size,
}: {
  className?: string;
  size?: ButtonSize;
}) {
  const { cycleTheme, Icon, label, mounted, nextLabel } = useThemeToggle();
  const accessibleName = mounted
    ? `Theme: ${label}. Switch to ${nextLabel.toLowerCase()}`
    : "Change theme";

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            aria-label={accessibleName}
            className={className}
            iconOnly
            onClick={cycleTheme}
            size={size}
            variant="ghost"
          />
        }
      >
        {mounted ? (
          <Icon className="size-4" />
        ) : (
          <span aria-hidden="true" className="size-4" />
        )}
      </TooltipTrigger>
      <TooltipContent>{accessibleName}</TooltipContent>
    </Tooltip>
  );
}
