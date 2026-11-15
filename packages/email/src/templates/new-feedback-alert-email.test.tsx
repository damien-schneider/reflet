import { render } from "@react-email/render";
import { describe, expect, it } from "vitest";
import { NewFeedbackAlertEmail } from "./new-feedback-alert-email";

const FEEDBACK_URL = "https://www.reflet.app/dashboard/acme/feedback/fb_123";

const alert = {
  authorEmail: "visitor@example.com",
  awaitingApproval: true,
  excerpt: "Exporting a 4K recording freezes at 99%",
  feedbackTitle: "Export freezes",
  feedbackUrl: FEEDBACK_URL,
  organizationName: "Acme",
};

describe("NewFeedbackAlertEmail", () => {
  it("links its call-to-action button to the feedback in the dashboard", async () => {
    const html = await render(<NewFeedbackAlertEmail {...alert} />);

    expect(html).toMatch(
      new RegExp(
        `<a[^>]*href="${FEEDBACK_URL}"[^>]*>.*Ouvrir dans le tableau de bord`,
        "s"
      )
    );
  });

  it("tells the admin who wrote what, where, and that it awaits approval", async () => {
    const text = await render(<NewFeedbackAlertEmail {...alert} />, {
      plainText: true,
    });

    expect(text).toMatch(/Nouveau feedback : Export freezes/i);
    expect(text).toContain("Organisation : Acme");
    expect(text).toContain("De : visitor@example.com");
    expect(text).toContain("« Exporting a 4K recording freezes at 99% »");
    expect(text).toContain(
      "Ce feedback attend votre approbation avant publication."
    );
    expect(text).toContain(FEEDBACK_URL);
  });

  it("leaves out the author and approval lines when they do not apply", async () => {
    const text = await render(
      <NewFeedbackAlertEmail
        {...alert}
        authorEmail={undefined}
        awaitingApproval={false}
      />,
      { plainText: true }
    );

    expect(text).not.toContain("De :");
    expect(text).not.toContain("approbation");
  });
});
