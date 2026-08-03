import { type ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { WIDGET_MARKER } from "../core/capture";
import { WIDGET_STYLES } from "./styles";

const DARK_QUERY = "(prefers-color-scheme: dark)";

export type WidgetTheme = "auto" | "dark" | "light";

function useResolvedTheme(theme: WidgetTheme): "dark" | "light" {
  const [systemDark, setSystemDark] = useState(false);

  useEffect(() => {
    if (theme !== "auto" || typeof window.matchMedia !== "function") {
      return;
    }

    const query = window.matchMedia(DARK_QUERY);
    setSystemDark(query.matches);

    const onChange = (event: MediaQueryListEvent) =>
      setSystemDark(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [theme]);

  if (theme === "auto") {
    return systemDark ? "dark" : "light";
  }
  return theme;
}

/**
 * Hosts the widget in a shadow root: the app's CSS cannot reach the panel and
 * the panel's CSS cannot reach the app. Direct DOM work is unavoidable here —
 * React has no declarative way to create a shadow root.
 */
export function ShadowPortal({
  children,
  offset,
  primaryColor,
  theme,
}: {
  children: ReactNode;
  offset: number;
  primaryColor?: string;
  theme: WidgetTheme;
}) {
  const [shadowRoot, setShadowRoot] = useState<ShadowRoot | null>(null);
  const resolvedTheme = useResolvedTheme(theme);

  useEffect(() => {
    const host = document.createElement("div");
    host.setAttribute(WIDGET_MARKER, "");
    const root = host.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = WIDGET_STYLES;
    root.append(style);
    document.body.append(host);
    setShadowRoot(root);

    return () => host.remove();
  }, []);

  useEffect(() => {
    const host = shadowRoot?.host;
    if (!(host instanceof HTMLElement)) {
      return;
    }

    host.setAttribute("data-theme", resolvedTheme);
    host.style.setProperty("--rf-offset", `${offset}px`);
    if (primaryColor) {
      host.style.setProperty("--rf-primary", primaryColor);
    }
  }, [shadowRoot, resolvedTheme, primaryColor, offset]);

  if (!shadowRoot) {
    return null;
  }

  return createPortal(children, shadowRoot);
}
