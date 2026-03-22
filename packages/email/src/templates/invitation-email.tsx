import {
  Button,
  Heading,
  Hr,
  Link,
  Section,
  Text,
} from "@react-email/components";
import { BaseLayout } from "./base-layout";
import { baseStyles } from "./styles";

interface InvitationEmailProps {
  acceptUrl?: string;
  inviterName?: string;
  organizationName?: string;
  role?: "admin" | "member";
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
      <Hr style={baseStyles.hr} />
      <Text style={baseStyles.linkText}>
        Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre
        navigateur :
      </Text>
      <Link href={acceptUrl} style={baseStyles.link}>
        {acceptUrl}
      </Link>
      <Text style={baseStyles.expiryText}>
        Cette invitation expire dans 7 jours.
      </Text>
    </BaseLayout>
  );
}

export default InvitationEmail;
