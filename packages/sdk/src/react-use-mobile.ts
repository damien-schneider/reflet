import { useCallback, useEffect, useRef, useState } from "react";

const MOBILE_BREAKPOINT = 640;

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);
  const mediaQueryRef = useRef<MediaQueryList | null>(null);

  const handleChange = useCallback((event: MediaQueryListEvent) => {
    setIsMobile(event.matches);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    mediaQueryRef.current = mql;
    setIsMobile(mql.matches);

    mql.addEventListener("change", handleChange);
    return () => {
      mql.removeEventListener("change", handleChange);
    };
  }, [handleChange]);

  return isMobile;
}
