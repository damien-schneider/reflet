import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Frame } from "../../protocol";
import { startNavigationWatch } from "./navigation-watch";

beforeEach(() => {
  vi.useFakeTimers();
  history.replaceState(null, "", "/start");
});

afterEach(() => {
  vi.useRealTimers();
});

describe("startNavigationWatch", () => {
  it("notices a pushState navigation on the next poll, with a redacted URL", () => {
    const frames: Frame[] = [];
    const watch = startNavigationWatch({
      onNavigate: (frame) => frames.push(frame),
    });
    history.pushState(null, "", "/settings?token=abc123&tab=team");
    expect(frames).toEqual([]);
    vi.advanceTimersByTime(500);
    watch.stop();
    expect(frames).toHaveLength(1);
    expect(frames[0]?.url).toContain("/settings");
    expect(frames[0]?.url).not.toContain("abc123");
    expect(frames[0]?.url).toContain("tab=team");
  });

  it("reacts to popstate at once and reports each URL once", () => {
    const onNavigate = vi.fn();
    const watch = startNavigationWatch({ onNavigate });
    history.pushState(null, "", "/billing");
    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(onNavigate).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(2000);
    watch.stop();
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  it("stops polling and listening on stop", () => {
    const onNavigate = vi.fn();
    startNavigationWatch({ onNavigate }).stop();
    history.pushState(null, "", "/elsewhere");
    window.dispatchEvent(new PopStateEvent("popstate"));
    vi.advanceTimersByTime(2000);
    expect(onNavigate).not.toHaveBeenCalled();
  });
});
