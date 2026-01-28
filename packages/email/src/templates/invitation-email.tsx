import { Button, Heading, Text } from "@react-email/components";
import { BaseLayout } from "./base-layout";

interface InvitationEmailProps {
  organizationName: string;
  inviterName: string;
  role: "admin" | "member";
  acceptUrl: string;
}

export function InvitationEmail({
  organizationName,
  inviterName,
  role,
  acceptUrl,
}: InvitationEmailProps) {
  const roleLabel = role === "admin" ? "admin" : "membre";

  return (
    <BaseLayout
      preview={`Vous avez reçu une invitation à rejoindre ${organizationName}`}
    >
      <Heading style={styles.heading}>
        Vous êtes invité à rejoindre {organizationName}
      </Heading>
      <Text style={styles.paragraph}>
        {inviterName} vous a invité à rejoindre l'organisation{" "}
        <strong>{organizationName}</strong> en tant que {roleLabel}.
      </Text>
      <Text style={styles.paragraph}>
        En acceptant cette invitation, vous aurez accès aux tableaux de
        feedback, à la roadmap et au changelog de l'organisation.
      </Text>
      <Button href={acceptUrl} style={styles.button}>
        Accepter l'invitation
      </Button>
      <Text style={styles.expiryText}>
        Cette invitation expire dans 7 jours.
      </Text>
    </BaseLayout>
  );
}

const styles = {
  heading: {
    color: "#18181b",
    fontSize: "24px",
    fontWeight: "600",
    margin: "0 0 24px",
  },
  paragraph: {
    color: "#3f3f46",
    fontSize: "16px",
    lineHeight: "24px",
    margin: "0 0 16px",
  },
  button: {
    backgroundColor: "#556b2f",
    borderRadius: "6px",
    color: "#ffffff",
    display: "inline-block",
    fontSize: "16px",
    fontWeight: "500",
    margin: "8px 0",
    padding: "14px 32px",
    textDecoration: "none",
  },
  expiryText: {
    color: "#a1a1aa",
    fontSize: "14px",
    lineHeight: "20px",
    margin: "16px 0 0",
  },
} as const;

export default InvitationEmail;
