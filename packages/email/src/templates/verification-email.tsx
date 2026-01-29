import { Button, Heading, Hr, Link, Text } from "@react-email/components";
import { BaseLayout } from "./base-layout";

interface VerificationEmailProps {
  userName?: string;
  verificationUrl?: string;
}

export function VerificationEmail({
  userName,
  verificationUrl = "https://example.com/verify",
}: VerificationEmailProps) {
  const greeting = userName ? `Bonjour ${userName}` : "Bonjour";

  return (
    <BaseLayout preview="Vérifiez votre adresse email pour activer votre compte Reflet">
      <Heading style={styles.heading}>{greeting},</Heading>
      <Text style={styles.paragraph}>
        Merci de vous être inscrit sur Reflet. Pour activer votre compte,
        veuillez vérifier votre adresse email en cliquant sur le bouton
        ci-dessous.
      </Text>
      <Button href={verificationUrl} style={styles.button}>
        Vérifier mon email
      </Button>
      <Text style={styles.linkText}>
        Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre
        navigateur :
      </Text>
      <Link href={verificationUrl} style={styles.link}>
        {verificationUrl}
      </Link>
      <Hr style={styles.hr} />
      <Text style={styles.disclaimer}>
        Si vous n'avez pas créé de compte sur Reflet, vous pouvez ignorer cet
        email.
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
    margin: 0,
  },
} as const;

export default VerificationEmail;
