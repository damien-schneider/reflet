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
  organizationName = "Mon Organisation",
  feedbackTitle = "Mon retour",
  releaseTitle = "Nouvelle version",
  feedbackUrl = "https://example.com/feedback",
  releaseUrl = "https://example.com/release",
  unsubscribeUrl = "https://example.com/unsubscribe",
}: FeedbackShippedEmailProps) {
  return (
    <BaseLayout
      preview={`${organizationName} a livré votre retour : ${feedbackTitle}`}
    >
      <Heading style={baseStyles.heading}>Votre retour a été livré !</Heading>
      <Text style={baseStyles.paragraph}>
        Bonne nouvelle ! <strong>{organizationName}</strong> a livré une
        fonctionnalité que vous aviez demandée.
      </Text>

      <Section style={{ marginBottom: "24px" }}>
        <Text style={{ ...baseStyles.paragraph, fontWeight: "bold" }}>
          Votre retour
        </Text>
        <Text style={baseStyles.paragraph}>{feedbackTitle}</Text>
      </Section>

      <Section style={{ marginBottom: "24px" }}>
        <Text style={{ ...baseStyles.paragraph, fontWeight: "bold" }}>
          Inclus dans
        </Text>
        <Text style={baseStyles.paragraph}>{releaseTitle}</Text>
      </Section>

      <Section style={baseStyles.buttonWrapper}>
        <Button href={feedbackUrl} style={baseStyles.button}>
          Voir le retour
        </Button>
      </Section>

      <Section style={{ marginTop: "12px", ...baseStyles.buttonWrapper }}>
        <Button
          href={releaseUrl}
          style={{ ...baseStyles.button, backgroundColor: "#6b7280" }}
        >
          Voir la release
        </Button>
      </Section>

      <Section style={{ marginTop: "32px", textAlign: "center" as const }}>
        <Text style={baseStyles.disclaimer}>
          Vous recevez cet email car vous suivez ce retour sur{" "}
          {organizationName}.
        </Text>
        <Text style={baseStyles.disclaimer}>
          <Link href={unsubscribeUrl} style={baseStyles.footerLink}>
            Se désabonner
          </Link>
        </Text>
        <Text style={baseStyles.disclaimer}>Reflet · Paris, France</Text>
      </Section>
    </BaseLayout>
  );
}

export default FeedbackShippedEmail;
