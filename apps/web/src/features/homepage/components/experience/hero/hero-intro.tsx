"use client";

import { type ReactNode, useEffect, useState } from "react";

// Survives client-side navigation, resets on a new visit.
let introPlayed = false;

export function HeroIntro({ children }: { children: ReactNode }) {
  const [intro] = useState(() => (introPlayed ? "skip" : "play"));
  useEffect(() => {
    introPlayed = true;
  }, []);
  return (
    <div className="hero-canvas" data-intro={intro}>
      {children}
    </div>
  );
}
