import { Button, Heading, Link, Section, Text } from "@react-email/components";
import { BaseLayout } from "./base-layout";
import { baseStyles } from "./styles";

interface ChangelogNotificationEmailProps {
  organizationName?: string;
  releaseTitle?: string;
  releaseVersion?: string;
  releaseDescription?: string;
  releaseUrl?: string;
  unsubscribeUrl?: string;
}

const MAX_DESCRIPTION_LENGTH = 300;

function truncateDescription(description: string): string {
  if (description.length <= MAX_DESCRIPTION_LENGTH) {
    return description;
  }
  return `${description.slice(0, MAX_DESCRIPTION_LENGTH).trim()}...`;
}

export function ChangelogNotificationEmail({
  organizationName = "Mon Organisation",
  releaseTitle = "Nouvelle version",
  releaseVersion = "v1.0.0",
  releaseDescription = "Description de la mise à jour...",
  releaseUrl = "https://example.com/changelog",
  unsubscribeUrl = "https://example.com/unsubscribe",
}: ChangelogNotificationEmailProps) {
  const truncatedDescription = truncateDescription(releaseDescription);

  return (
    <BaseLayout
      preview={`${organizationName} a publié une nouvelle mise à jour : ${releaseTitle}`}
    >
      <Heading style={baseStyles.heading}>
        {releaseTitle}
        {releaseVersion ? ` (${releaseVersion})` : ""}
      </Heading>
      <Text style={baseStyles.paragraph}>
        <strong>{organizationName}</strong> vient de publier une nouvelle mise à
        jour.
      </Text>
      <Text style={baseStyles.paragraph}>{truncatedDescription}</Text>
      <Section style={baseStyles.buttonWrapper}>
        <Button href={releaseUrl} style={baseStyles.button}>
          Voir la mise à jour
        </Button>
      </Section>
      <Section style={{ marginTop: "32px", textAlign: "center" as const }}>
        <Text style={baseStyles.disclaimer}>
          Vous recevez cet email car vous êtes abonné au changelog de{" "}
          {organizationName}.
        </Text>
        <Text style={baseStyles.disclaimer}>
          <Link href={unsubscribeUrl} style={baseStyles.footerLink}>
            Se désabonner
          </Link>
        </Text>
      </Section>
    </BaseLayout>
  );
}

export default ChangelogNotificationEmail;
