import { render } from "@react-email/render";
import { describe, expect, it } from "vitest";
import { InvitationEmail } from "./invitation-email";

describe("InvitationEmail", () => {
  it("renders with organization name", async () => {
    const html = await render(
      // biome-ignore lint/a11y/useValidAriaRole: role is a component prop, not ARIA role
      <InvitationEmail
        acceptUrl="https://app.reflet.dev/invite/abc123"
        inviterName="John Doe"
        organizationName="Acme Corp"
        role="member"
      />
    );

    expect(html).toContain("Acme Corp");
  });

  it("renders with inviter name", async () => {
    const html = await render(
      // biome-ignore lint/a11y/useValidAriaRole: role is a component prop, not ARIA role
      <InvitationEmail
        acceptUrl="https://app.reflet.dev/invite/abc123"
        inviterName="John Doe"
        organizationName="Acme Corp"
        role="member"
      />
    );

    expect(html).toContain("John Doe");
  });

  it("renders member role correctly", async () => {
    const html = await render(
      // biome-ignore lint/a11y/useValidAriaRole: role is a component prop, not ARIA role
      <InvitationEmail
        acceptUrl="https://app.reflet.dev/invite/abc123"
        inviterName="John Doe"
        organizationName="Acme Corp"
        role="member"
      />
    );

    expect(html).toContain("membre");
  });

  it("renders admin role correctly", async () => {
    const html = await render(
      // biome-ignore lint/a11y/useValidAriaRole: role is a component prop, not ARIA role
      <InvitationEmail
        acceptUrl="https://app.reflet.dev/invite/abc123"
        inviterName="John Doe"
        organizationName="Acme Corp"
        role="admin"
      />
    );

    expect(html).toContain("admin");
  });

  it("renders accept button with correct URL", async () => {
    const html = await render(
      // biome-ignore lint/a11y/useValidAriaRole: role is a component prop, not ARIA role
      <InvitationEmail
        acceptUrl="https://app.reflet.dev/invite/abc123"
        inviterName="John Doe"
        organizationName="Acme Corp"
        role="member"
      />
    );

    expect(html).toContain("https://app.reflet.dev/invite/abc123");
  });

  it("includes preview text with organization name", async () => {
    const html = await render(
      // biome-ignore lint/a11y/useValidAriaRole: role is a component prop, not ARIA role
      <InvitationEmail
        acceptUrl="https://app.reflet.dev/invite/abc123"
        inviterName="John Doe"
        organizationName="Acme Corp"
        role="member"
      />
    );

    expect(html).toContain("invitation");
    expect(html).toContain("Acme Corp");
  });
});
