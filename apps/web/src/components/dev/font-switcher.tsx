"use client";

import { useEffect, useRef, useState } from "react";

const FONT_GROUPS = [
  {
    fonts: [
      "Schibsted Grotesk",
      "Onest",
      "Instrument Sans",
      "Hanken Grotesk",
      "Familjen Grotesk",
      "Manrope",
      "Figtree",
      "Plus Jakarta Sans",
      "Inter Tight",
      "Public Sans",
      "DM Sans",
      "Geist",
    ],
    label: "Sans",
  },
  {
    fonts: [
      "Fraunces",
      "Instrument Serif",
      "Bricolage Grotesque",
      "Syne",
      "Unbounded",
      "Gloock",
      "Playfair Display",
    ],
    label: "Display",
  },
];

const loadFont = (family: string) => {
  const id = `font-preview-${family}`;
  if (document.getElementById(id)) {
    return;
  }
  const query = family.replaceAll(" ", "+");
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${query}:wght@300..800&display=swap`;
  link.addEventListener("error", () => {
    if (link.dataset.retried) {
      return;
    }
    link.dataset.retried = "true";
    link.href = `https://fonts.googleapis.com/css2?family=${query}&display=swap`;
  });
  document.head.append(link);
};

const useFontPreview = (cssVar: string, fallback: string) => {
  const [family, setFamily] = useState("");
  const restored = useRef(false);

  useEffect(() => {
    if (!restored.current) {
      restored.current = true;
      const saved = localStorage.getItem(cssVar);
      if (saved) {
        setFamily(saved);
        return;
      }
    }
    const root = document.documentElement;
    if (family) {
      loadFont(family);
      root.style.setProperty(cssVar, `"${family}", ${fallback}`);
      localStorage.setItem(cssVar, family);
      return;
    }
    root.style.removeProperty(cssVar);
    localStorage.removeItem(cssVar);
  }, [cssVar, fallback, family]);

  return [family, setFamily] as const;
};

const SELECT_CLASS =
  "rounded border border-border bg-background px-1.5 py-1 font-sans text-foreground text-xs";

function FontSelect({
  id,
  label,
  onChange,
  value,
}: {
  id: string;
  label: string;
  onChange: (family: string) => void;
  value: string;
}) {
  return (
    <label className="flex items-center gap-1" htmlFor={id}>
      <span className="text-muted-foreground">{label}</span>
      <select
        className={SELECT_CLASS}
        id={id}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        <option value="">Build default</option>
        {FONT_GROUPS.map((group) => (
          <optgroup key={group.label} label={group.label}>
            {group.fonts.map((font) => (
              <option key={font} value={font}>
                {font}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  );
}

export function FontSwitcher() {
  const [sans, setSans] = useFontPreview(
    "--font-sans",
    "system-ui, sans-serif"
  );
  const [display, setDisplay] = useFontPreview("--font-display", "serif");

  return (
    <div className="fixed right-4 bottom-4 z-[999] flex items-center gap-2 rounded-lg border border-border bg-background/95 p-2 text-xs shadow-lg backdrop-blur">
      <FontSelect
        id="font-preview-sans"
        label="Sans"
        onChange={setSans}
        value={sans}
      />
      <FontSelect
        id="font-preview-display"
        label="Display"
        onChange={setDisplay}
        value={display}
      />
    </div>
  );
}
