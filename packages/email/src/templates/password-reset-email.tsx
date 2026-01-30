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
      <Heading style={baseStyles.heading}>{greeting},</Heading>
      <Text style={baseStyles.paragraph}>
        Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le
        bouton ci-dessous pour choisir un nouveau mot de passe.
      </Text>
      <Section style={baseStyles.buttonWrapper}>
        <Button href={resetUrl} style={baseStyles.button}>
          Réinitialiser mon mot de passe
        </Button>
      </Section>
      <Text style={baseStyles.linkText}>
        Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre
        navigateur :
      </Text>
      <Link href={resetUrl} style={baseStyles.link}>
        {resetUrl}
      </Link>
      <Hr style={baseStyles.hr} />
      <Text style={baseStyles.disclaimer}>
        Si vous n'avez pas demandé de réinitialisation de mot de passe, vous
        pouvez ignorer cet email. Votre mot de passe restera inchangé.
      </Text>
      <Text style={{ ...baseStyles.disclaimer, marginTop: "8px" }}>
        Ce lien expirera dans 1 heure pour des raisons de sécurité.
      </Text>
    </BaseLayout>
  );
}

export default PasswordResetEmail;
