import { Button, Heading, Link, Section, Text } from "@react-email/components";
import { BaseLayout } from "./base-layout";
import { baseStyles } from "./styles";

interface FeedbackShippedEmailProps {
  organizationName?: string;
  feedbackTitle?: string;
  releaseTitle?: string;
  feedbackUrl?: string;
  releaseUrl?: string;
  unsubscribeUrl?: string;
}

export function FeedbackShippedEmail({
  organizationName = "My Organization",
  feedbackTitle = "Dark mode support",
  releaseTitle = "v2.1.0",
  feedbackUrl: _feedbackUrl = "https://example.com/feedback/123",
  releaseUrl = "https://example.com/changelog",
  unsubscribeUrl = "https://example.com/unsubscribe",
}: FeedbackShippedEmailProps) {
  return (
    <BaseLayout
      preview={`${organizationName}: Your feedback "${feedbackTitle}" has shipped!`}
    >
      <Heading style={baseStyles.heading}>You asked, we shipped! 🚀</Heading>
      <Text style={baseStyles.paragraph}>
        Great news! <strong>{organizationName}</strong> has shipped a feature
        you requested:
      </Text>
      <Text
        style={{
          ...baseStyles.paragraph,
          fontSize: "18px",
          fontWeight: "600",
        }}
      >
        &ldquo;{feedbackTitle}&rdquo;
      </Text>
      <Text style={baseStyles.paragraph}>
        This was included in the release:{" "}
        <Link href={releaseUrl} style={{ color: "#5C6D4F" }}>
          {releaseTitle}
        </Link>
      </Text>
      <Section style={baseStyles.buttonWrapper}>
        <Button href={releaseUrl} style={baseStyles.button}>
          See the release
        </Button>
      </Section>
      <Section style={{ marginTop: "32px", textAlign: "center" as const }}>
        <Text style={baseStyles.disclaimer}>
          You&apos;re receiving this because you voted on or subscribed to this
          feedback item on {organizationName}.
        </Text>
        <Text style={baseStyles.disclaimer}>
          <Link href={unsubscribeUrl} style={baseStyles.footerLink}>
            Unsubscribe
          </Link>
        </Text>
      </Section>
    </BaseLayout>
  );
}

export default FeedbackShippedEmail;
