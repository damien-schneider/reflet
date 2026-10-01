import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { AiRejectionBadge } from "@/features/feedback/components/properties/presentation/ai-rejection-badge";

test("names the junk risk beside the percentage when scanning feedback", () => {
  render(<AiRejectionBadge probability={0.55} />);

  expect(screen.getByText("Junk risk:")).toBeVisible();
  expect(screen.getByLabelText("AI junk risk: 55%")).toHaveTextContent(
    "Junk risk:55%"
  );
});
