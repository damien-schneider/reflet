import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { GoProBanner } from "./go-pro-banner";

describe("GoProBanner", () => {
  it("links to the reachable project billing page", () => {
    render(<GoProBanner orgSlug="acme" />);

    expect(screen.getByRole("link", { name: "Go Pro" })).toHaveAttribute(
      "href",
      "/dashboard/acme/project/billing"
    );
  });
});
