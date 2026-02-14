"use client";

import { useEffect, useState } from "react";

const TABLET_MIN = 768;
const TABLET_MAX = 1024;

export function useIsTablet(): boolean {
  const [isTablet, setIsTablet] = useState<boolean>(false);

  useEffect(() => {
    const mql = window.matchMedia(
      `(min-width: ${TABLET_MIN}px) and (max-width: ${TABLET_MAX - 1}px)`
    );

    const onChange = () => {
      const width = window.innerWidth;
      setIsTablet(width >= TABLET_MIN && width < TABLET_MAX);
    };

    mql.addEventListener("change", onChange);
    onChange();

    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isTablet;
}
