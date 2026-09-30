import { Button, Heading, Hr, Link, Section, Text } from "react-email";
import { BaseLayout } from "./base-layout";
import { baseStyles } from "./styles";

interface SubscriptionConfirmationEmailProps {
  confirmUrl?: string;
  list?: "changelog" | "status";
  organizationName?: string;
}

const LIST_LABELS = {
  changelog: "au changelog",
  status: "aux mises à jour de statut",
} as const;

export function SubscriptionConfirmationEmail({
  organizationName = "Mon Organisation",
  list = "changelog",
  confirmUrl = "https://example.com/subscriptions/confirm",
}: SubscriptionConfirmationEmailProps) {
  const listLabel = LIST_LABELS[list];

  return (
    <BaseLayout
      preview={`Confirmez votre abonnement ${listLabel} de ${organizationName}`}
    >
      <Heading style={baseStyles.heading}>Confirmez votre abonnement</Heading>
      <Text style={baseStyles.paragraph}>
        Quelqu'un a demandé à abonner cette adresse {listLabel} de{" "}
        <strong>{organizationName}</strong>. Vous ne recevrez aucun email tant
        que vous n'aurez pas confirmé.
      </Text>
      <Section style={baseStyles.buttonWrapper}>
        <Button href={confirmUrl} style={baseStyles.button}>
          Confirmer mon abonnement
        </Button>
      </Section>
      <Text style={baseStyles.linkText}>
        Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre
        navigateur :
      </Text>
      <Link href={confirmUrl} style={baseStyles.link}>
        {confirmUrl}
      </Link>
      <Hr style={baseStyles.hr} />
      <Text style={baseStyles.disclaimer}>
        Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.
      </Text>
    </BaseLayout>
  );
}

export default SubscriptionConfirmationEmail;
