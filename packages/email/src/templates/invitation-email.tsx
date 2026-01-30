import { Button, Heading, Section, Text } from "@react-email/components";
import { BaseLayout } from "./base-layout";
import { baseStyles } from "./styles";

interface InvitationEmailProps {
  organizationName?: string;
  inviterName?: string;
  role?: "admin" | "member";
  acceptUrl?: string;
}

export function InvitationEmail({
  organizationName = "Mon Organisation",
  inviterName = "Jean Dupont",
  role = "member",
  acceptUrl = "https://example.com/accept",
}: InvitationEmailProps) {
  const roleLabel = role === "admin" ? "admin" : "membre";

  return (
    <BaseLayout
      preview={`Vous avez reçu une invitation à rejoindre ${organizationName}`}
    >
      <Heading style={baseStyles.heading}>
        Vous êtes invité à rejoindre {organizationName}
      </Heading>
      <Text style={baseStyles.paragraph}>
        {inviterName} vous a invité à rejoindre l'organisation{" "}
        <strong>{organizationName}</strong> en tant que {roleLabel}.
      </Text>
      <Text style={baseStyles.paragraph}>
        En acceptant cette invitation, vous aurez accès aux tableaux de
        feedback, à la roadmap et au changelog de l'organisation.
      </Text>
      <Section style={baseStyles.buttonWrapper}>
        <Button href={acceptUrl} style={baseStyles.button}>
          Accepter l'invitation
        </Button>
      </Section>
      <Text style={baseStyles.expiryText}>
        Cette invitation expire dans 7 jours.
      </Text>
    </BaseLayout>
  );
}

export default InvitationEmail;
