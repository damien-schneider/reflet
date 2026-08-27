import type { ReactNode } from "react";
import { activeSkin, type SkinAdornmentContexts, type SkinAdornmentPart, type SkinAdornmentScope } from "./skin";

function resolveAdornment<Ctx>(entry: ReactNode | ((ctx: Ctx) => ReactNode) | undefined, ctx: Ctx): ReactNode | undefined {
  if (entry === undefined) return undefined;
  return typeof entry === "function" ? entry(ctx) : entry;
}

export function skinAdornment<Scope extends SkinAdornmentScope, Part extends SkinAdornmentPart<Scope>>(
  scope: Scope,
  part: Part,
  ctx: SkinAdornmentContexts[Scope][Part],
): ReactNode | undefined {
  return resolveAdornment(activeSkin().adornments?.[scope]?.[part], ctx);
}

export function hasSkinAdornment<Scope extends SkinAdornmentScope, Part extends SkinAdornmentPart<Scope>>(
  scope: Scope,
  part: Part,
): boolean {
  return activeSkin().adornments?.[scope]?.[part] !== undefined;
}
