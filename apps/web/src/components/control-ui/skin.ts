import type { ReactNode } from "react";
import type { ButtonTone, ButtonVariant, ControlEffect, SelectionIndicator } from "./contracts";
import { skin } from "./skin.config";

type StatelessPart = Record<never, never>;
export type SkinAdornmentContexts = {
  button: { layer: { variant: ButtonVariant; tone: ButtonTone } };
  "chat-layout": { titlebar: StatelessPart };
  "chat-thought": { details: StatelessPart };
  dialog: { titlebar: StatelessPart };
  "chat-composer": { "send-layer": { sendCount: number } };
};

export type SkinAdornmentScope = keyof SkinAdornmentContexts;
export type SkinAdornmentPart<Scope extends SkinAdornmentScope> = keyof SkinAdornmentContexts[Scope];

type AdornmentEntry<Ctx> = ReactNode | ((ctx: Ctx) => ReactNode);

export type ControlUiSkin = {
  /** Scopes theme.css/skin.css via data-skin; components stamp it on portal containers. */
  id: string;
  /** Stamps data-motion="reduced", collapsing --duration-* to 0ms. Never `animation:none` — ripple cleanup still needs `animationend` to fire. */
  motion?: "reduced";
  /** Locks skin to one scheme; page's .dark class must then follow it, since Shiki, native color-scheme, and dark: utilities key off .dark, not skin tokens. Undefined = adaptive, both blocks authored. */
  colorScheme?: "light" | "dark";
  /** Geometry, not slot restyle — padding, gap, rounding, and shadow across sidebar gap/container/inner. explicit `variant` prop wins; undefined keeps "sidebar". */
  sidebarLayout?: SidebarLayout;
  /** App-wide choice: sidebars and trees all glide or none do. Explicit `indicator` still wins; undefined also skips highlight engine's lazy chunk. */
  indicators?: { sidebar?: SelectionIndicator; tree?: SelectionIndicator };
  /** Any CSS length. Seeds --sidebar-width; caller's own value still wins. Undefined keeps shadcn's 16rem. */
  sidebarWidth?: string;
  /** effects.css keys off data-effects ancestor attribute. top-shine is CSS-only; ripple needs runtime's document pointer listener. */
  effects?: ControlEffect[];
  adornments?: {
    [Scope in SkinAdornmentScope]?: {
      [Part in SkinAdornmentPart<Scope>]?: AdornmentEntry<SkinAdornmentContexts[Scope][Part]>;
    };
  };
};

export type SidebarLayout = "sidebar" | "floating" | "inset";

/** Read at render time so getter-based configs stay live. Portals stamp it on their positioner, which lands outside any token-scoped ancestor. */
export function activeSkin(): ControlUiSkin {
  return skin;
}

export function skinId(): string {
  return skin.id;
}

/** Sidebar falls back: variant prop → this → "sidebar". */
export function skinSidebarLayout(): SidebarLayout | undefined {
  return skin.sidebarLayout;
}

/** Component falls back: indicator prop → this → "none". */
export function skinIndicator(component: "sidebar" | "tree"): SelectionIndicator | undefined {
  return skin.indicators?.[component];
}

/** SidebarProvider seeds --sidebar-width from this; caller-provided value still wins. */
export function skinSidebarWidth(): string | undefined {
  return skin.sidebarWidth;
}

/** Portals stamp result next to data-skin; ControlEffectsRuntime mirrors it on <html>. */
export function skinEffects(): string | undefined {
  const effects = skin.effects;
  return effects && effects.length > 0 ? effects.join(" ") : undefined;
}
