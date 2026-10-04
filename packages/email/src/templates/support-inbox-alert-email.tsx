import { Button, Heading, Section, Text } from "react-email";
import { BaseLayout } from "./base-layout";
import { baseStyles } from "./styles";

interface SupportInboxAlertEmailProps {
  conversationUrl?: string;
  organizationName?: string;
  personLabel?: string;
  preview?: string;
}

export function SupportInboxAlertEmail({
  conversationUrl = "https://www.reflet.app/dashboard",
  organizationName = "Mon Organisation",
  personLabel = "client@example.com",
  preview = "Bonjour, j'ai une question sur ma facture.",
}: SupportInboxAlertEmailProps) {
  return (
    <BaseLayout preview={`Nouveau message de ${personLabel}`}>
      <Heading style={baseStyles.heading}>
        Nouveau message de {personLabel}
      </Heading>
      <Text style={baseStyles.paragraph}>
        Un client a écrit au support de <strong>{organizationName}</strong> :
      </Text>
      <Text style={baseStyles.paragraph}>« {preview} »</Text>
      <Section style={baseStyles.buttonWrapper}>
        <Button href={conversationUrl} style={baseStyles.button}>
          Ouvrir la conversation
        </Button>
      </Section>
      <Text style={baseStyles.linkText}>
        Vous ne recevrez pas d'autre e-mail pour cette conversation tant que ce
        message n'a pas été lu.
      </Text>
    </BaseLayout>
  );
}

export default SupportInboxAlertEmail;
