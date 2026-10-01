import { render, screen } from "@testing-library/react";
import type { RefletFeedbackProps } from "reflet-sdk/feedback";
import { beforeEach, expect, it, vi } from "vitest";
import { DashboardFeedback } from "@/features/dashboard/components/support/dashboard-feedback";

const fixture = vi.hoisted(() => ({
  session: {
    user: { email: "jane@example.com", id: "user_123", name: "Jane" },
  },
  theme: "dark",
  widget: vi.fn<(props: RefletFeedbackProps) => void>(),
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: { useSession: () => ({ data: fixture.session }) },
}));
vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: fixture.theme }),
}));
vi.mock("@reflet/env/web", () => ({
  env: { NEXT_PUBLIC_REFLET_PUBLIC_KEY: "fb_pub_reflet" },
}));
vi.mock("reflet-sdk/feedback", () => ({
  RefletFeedback: (props: RefletFeedbackProps) => {
    fixture.widget(props);
    return props.renderTrigger?.({ onClick: vi.fn(), ref: { current: null } });
  },
}));

beforeEach(() => fixture.widget.mockClear());

it("reports to Reflet with the signed-in identity and app theme", () => {
  render(<DashboardFeedback />);
  expect(
    screen.getByRole("button", { name: "Send feedback to Reflet" })
  ).toBeVisible();
  expect(fixture.widget).toHaveBeenCalledWith(
    expect.objectContaining({
      publicKey: "fb_pub_reflet",
      theme: "dark",
      user: fixture.session.user,
    })
  );
});
