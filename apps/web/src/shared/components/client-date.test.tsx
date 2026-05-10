import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ClientDate } from "./client-date";
import { useClientHostname, useClientHydrated } from "./client-hydration";

const TIMESTAMP = Date.UTC(2026, 4, 9, 12, 30);

afterEach(() => {
  cleanup();
});

describe("ClientDate", () => {
  it("renders a date using a stable production formatter", () => {
    render(<ClientDate value={TIMESTAMP} />);

    expect(screen.getByText("May 9, 2026")).toBeInTheDocument();
  });

  it("renders date-time values without requiring server locale output", () => {
    render(<ClientDate value={TIMESTAMP} variant="dateTime" />);

    expect(screen.getByText(/May 9, 2026/)).toBeInTheDocument();
  });

  it("renders compact dates for dense UI", () => {
    render(<ClientDate value={TIMESTAMP} variant="shortDate" />);

    expect(screen.getByText("May 9")).toBeInTheDocument();
  });

  it("applies layout class names from the caller", () => {
    render(<ClientDate className="text-muted-foreground" value={TIMESTAMP} />);

    expect(screen.getByText("May 9, 2026")).toHaveClass(
      "text-muted-foreground"
    );
  });
});

function ClientHydrationProbe() {
  const hydrated = useClientHydrated();
  const hostname = useClientHostname();

  return <output>{`${String(hydrated)}:${hostname ?? "server"}`}</output>;
}

describe("client hydration helpers", () => {
  it("reads client-only browser state through a hydration-safe store", () => {
    const expectedHostname = window.location.hostname;

    render(<ClientHydrationProbe />);

    expect(screen.getByText(`true:${expectedHostname}`)).toBeInTheDocument();
  });
});
