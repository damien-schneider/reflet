import { Button, Heading, Hr, Link, Text } from "@react-email/components";
import { BaseLayout } from "./base-layout";

interface PasswordResetEmailProps {
  userName?: string;
  resetUrl?: string;
}

export function PasswordResetEmail({
  userName,
  resetUrl = "https://example.com/reset",
}: PasswordResetEmailProps) {
  const greeting = userName ? `Bonjour ${userName}` : "Bonjour";

  return (
    <BaseLayout preview="Réinitialisez votre mot de passe Reflet">
      <Heading style={styles.heading}>{greeting},</Heading>
      <Text style={styles.paragraph}>
        Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le
        bouton ci-dessous pour choisir un nouveau mot de passe.
      </Text>
      <Button href={resetUrl} style={styles.button}>
        Réinitialiser mon mot de passe
      </Button>
      <Text style={styles.linkText}>
        Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre
        navigateur :
      </Text>
      <Link href={resetUrl} style={styles.link}>
        {resetUrl}
      </Link>
      <Hr style={styles.hr} />
      <Text style={styles.disclaimer}>
        Si vous n'avez pas demandé de réinitialisation de mot de passe, vous
        pouvez ignorer cet email. Votre mot de passe restera inchangé.
      </Text>
      <Text style={styles.expiryNote}>
        Ce lien expirera dans 1 heure pour des raisons de sécurité.
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
    margin: "0 0 24px",
  },
  button: {
    backgroundColor: "#556b2f",
    borderRadius: "6px",
    color: "#ffffff",
    display: "inline-block",
    fontSize: "16px",
    fontWeight: "500",
    margin: "8px 0 32px",
    padding: "14px 32px",
    textDecoration: "none",
  },
  linkText: {
    color: "#71717a",
    fontSize: "14px",
    lineHeight: "20px",
    margin: "0 0 8px",
  },
  link: {
    color: "#556b2f",
    fontSize: "14px",
    lineHeight: "20px",
    wordBreak: "break-all" as const,
  },
  hr: {
    border: "none",
    borderTop: "1px solid #e4e4e7",
    margin: "32px 0",
  },
  disclaimer: {
    color: "#a1a1aa",
    fontSize: "12px",
    lineHeight: "18px",
    margin: "0 0 8px",
  },
  expiryNote: {
    color: "#a1a1aa",
    fontSize: "12px",
    lineHeight: "18px",
    margin: 0,
  },
} as const;

export default PasswordResetEmail;
