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
      <Heading style={baseStyles.heading}>{greeting},</Heading>
      <Text style={baseStyles.paragraph}>
        Merci de vous être inscrit sur Reflet. Pour activer votre compte,
        veuillez vérifier votre adresse email en cliquant sur le bouton
        ci-dessous.
      </Text>
      <Section style={baseStyles.buttonWrapper}>
        <Button href={verificationUrl} style={baseStyles.button}>
          Vérifier mon email
        </Button>
      </Section>
      <Text style={baseStyles.linkText}>
        Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre
        navigateur :
      </Text>
      <Link href={verificationUrl} style={baseStyles.link}>
        {verificationUrl}
      </Link>
      <Hr style={baseStyles.hr} />
      <Text style={baseStyles.disclaimer}>
        Si vous n'avez pas créé de compte sur Reflet, vous pouvez ignorer cet
        email.
      </Text>
    </BaseLayout>
  );
}

export default VerificationEmail;
