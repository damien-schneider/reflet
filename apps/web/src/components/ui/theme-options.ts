import { Desktop, Moon, Sun } from "@phosphor-icons/react";
import type { ComponentType } from "react";

export const themes = ["system", "light", "dark"] as const;
export type Theme = (typeof themes)[number];

export const themeIcons: Record<
  Theme,
  ComponentType<{ className?: string }>
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
