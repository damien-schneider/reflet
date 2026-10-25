import type { SessionSurface } from "../protocol";

export interface SurfaceCapture {
  page: boolean;
  pauseWhenHidden: boolean;
  source: boolean;
}

export const SURFACE_CAPTURE: Record<SessionSurface, SurfaceCapture> = {
  app: { page: true, pauseWhenHidden: true, source: false },
  devtools: { page: true, pauseWhenHidden: true, source: true },
  live: { page: false, pauseWhenHidden: false, source: false },
};
