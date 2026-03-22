import { useCallback, useEffect, useRef } from "react";
import type { ChangelogEntry } from "./types";

interface ChangelogWidgetProps {
  autoOpenForNew?: boolean;
  locale?: string;
  maxEntries?: number;
  mode?: "card" | "popup" | "trigger";
  onClose?: () => void;
  onEntryClick?: (entry: ChangelogEntry) => void;
  onOpen?: () => void;
  position?: "bottom-right" | "bottom-left";
  primaryColor?: string;
  publicKey: string;
  theme?: "light" | "dark" | "auto";
  triggerSelector?: string;
}

interface WidgetInstance {
  close: () => void;
  destroy: () => void;
  getUnreadCount: () => number;
  init: () => Promise<void>;
  markAsRead: () => void;
  open: () => void;
}

declare global {
  interface Window {
    RefletChangelogWidget?: new (
      config: ChangelogWidgetProps
    ) => WidgetInstance;
  }
}

/**
 * React component that wraps the Reflet Changelog Widget.
 *
 * Dynamically loads and initializes a RefletChangelogWidget instance.
 *
 * @example
 * ```tsx
 * import { ChangelogWidget } from 'reflet-sdk/react';
 *
 * export function MyApp() {
 *   return <ChangelogWidget publicKey="fb_pub_xxx" mode="card" theme="auto" />;
 * }
 * ```
 */
export function ChangelogWidget({
  publicKey,
  mode = "card",
  position = "bottom-right",
  theme = "light",
  primaryColor,
  maxEntries,
  triggerSelector,
  autoOpenForNew,
  locale,
  onOpen,
  onClose,
  onEntryClick,
}: ChangelogWidgetProps) {
  const widgetRef = useRef<WidgetInstance | null>(null);

  const initWidget = useCallback(async () => {
    // Check if RefletChangelogWidget is available globally
    const WidgetClass = window.RefletChangelogWidget;

    if (WidgetClass) {
      const instance = new WidgetClass({
        publicKey,
        mode,
        position,
        theme,
        primaryColor,
        maxEntries,
        triggerSelector,
        autoOpenForNew,
        locale,
        onOpen,
        onClose,
        onEntryClick,
      });

      widgetRef.current = instance;
      await instance.init();
      return;
    }

    // Try loading the script dynamically
    const existingScript = document.querySelector(
      'script[src*="reflet-changelog"]'
    );
    if (!existingScript) {
      const script = document.createElement("script");
      script.src = "https://cdn.reflet.app/widget/reflet-changelog.v1.js";
      script.async = true;
      script.onload = () => {
        const LoadedClass = window.RefletChangelogWidget;

        if (LoadedClass) {
          const instance = new LoadedClass({
            publicKey,
            mode,
            position,
            theme,
            primaryColor,
            maxEntries,
            triggerSelector,
            autoOpenForNew,
            locale,
            onOpen,
            onClose,
            onEntryClick,
          });

          widgetRef.current = instance;
          instance.init();
        }
      };
      document.head.appendChild(script);
    }
  }, [
    publicKey,
    mode,
    position,
    theme,
    primaryColor,
    maxEntries,
    triggerSelector,
    autoOpenForNew,
    locale,
    onOpen,
    onClose,
    onEntryClick,
  ]);

  useEffect(() => {
    initWidget();

    return () => {
      if (widgetRef.current) {
        widgetRef.current.destroy();
        widgetRef.current = null;
      }
    };
  }, [initWidget]);

  // This component doesn't render visible DOM - the widget manages its own Shadow DOM
  return null;
}
