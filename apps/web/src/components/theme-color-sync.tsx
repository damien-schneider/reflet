"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";

function toRgb(color: string): string {
  const context = document.createElement("canvas").getContext("2d");
  if (!context) {
    return color;
  }
  context.fillStyle = color;
  context.fillRect(0, 0, 1, 1);
  const [red, green, blue] = context.getImageData(0, 0, 1, 1).data;
  return `rgb(${red} ${green} ${blue})`;
}

export function ThemeColorSync() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!resolvedTheme) {
      return;
    }
    const canvasColor = toRgb(
      getComputedStyle(document.documentElement).backgroundColor
    );
    for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
      meta.setAttribute("content", canvasColor);
    }
  }, [resolvedTheme]);

  return null;
}
