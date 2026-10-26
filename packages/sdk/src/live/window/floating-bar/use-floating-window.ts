import { useCallback, useEffect, useState } from "react";
import { reportFailure } from "../../../devtools/client/notices";
import { followColorScheme } from "../color-scheme";

const BAR_SIZE = { height: 72, width: 680 };
const STYLESHEET_PATH = "/live-window.css";

interface PictureInPictureApi {
  requestWindow: (options: {
    height: number;
    width: number;
  }) => Promise<Window>;
}

function isPictureInPictureApi(value: unknown): value is PictureInPictureApi {
  return (
    typeof value === "object" &&
    value !== null &&
    "requestWindow" in value &&
    typeof value.requestWindow === "function"
  );
}

function pictureInPicture(): PictureInPictureApi | null {
  const api: unknown = Reflect.get(window, "documentPictureInPicture");
  return isPictureInPictureApi(api) ? api : null;
}

function dressFloatingDocument(target: Document): () => void {
  target.title = "Reflet Live";
  const stylesheet = target.createElement("link");
  stylesheet.rel = "stylesheet";
  stylesheet.href = new URL(STYLESHEET_PATH, window.location.href).href;
  target.head.append(stylesheet);
  return followColorScheme(target);
}

export interface FloatingWindow {
  close: () => void;
  isSupported: boolean;
  open: () => Promise<void>;
  window: Window | null;
}

export function useFloatingWindow(): FloatingWindow {
  const [floating, setFloating] = useState<Window | null>(null);

  const open = useCallback(async () => {
    const api = pictureInPicture();
    if (!api) {
      return;
    }
    try {
      const opened = await api.requestWindow(BAR_SIZE);
      const undress = dressFloatingDocument(opened.document);
      opened.addEventListener(
        "pagehide",
        () => {
          undress();
          setFloating(null);
        },
        { once: true }
      );
      setFloating(opened);
    } catch (error) {
      reportFailure("The floating bar did not open", error);
    }
  }, []);

  useEffect(() => () => floating?.close(), [floating]);

  return {
    close: () => floating?.close(),
    isSupported: pictureInPicture() !== null,
    open,
    window: floating,
  };
}
