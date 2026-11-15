import { Button, Heading, Section, Text } from "react-email";
import { BaseLayout } from "./base-layout";
import { baseStyles } from "./styles";

interface NewFeedbackAlertEmailProps {
  authorEmail?: string;
  awaitingApproval?: boolean;
  excerpt?: string;
  feedbackTitle?: string;
  feedbackUrl?: string;
  organizationName?: string;
}

export function NewFeedbackAlertEmail({
  authorEmail,
  awaitingApproval = false,
  excerpt = "L'export d'un enregistrement 4K se bloque à 99 %.",
  feedbackTitle = "L'export se bloque",
  feedbackUrl = "https://www.reflet.app/dashboard",
  organizationName = "Mon Organisation",
}: NewFeedbackAlertEmailProps) {
  const title = `Nouveau feedback : ${feedbackTitle}`;
  return (
    <BaseLayout preview={title}>
      <Heading style={baseStyles.heading}>{title}</Heading>
      <Text style={baseStyles.paragraph}>
        Organisation : <strong>{organizationName}</strong>
      </Text>
      {authorEmail ? (
        <Text style={baseStyles.paragraph}>De : {authorEmail}</Text>
      ) : null}
      {excerpt ? <Text style={baseStyles.paragraph}>« {excerpt} »</Text> : null}
      {awaitingApproval ? (
        <Text style={baseStyles.paragraph}>
          Ce feedback attend votre approbation avant publication.
        </Text>
      ) : null}
      <Section style={baseStyles.buttonWrapper}>
        <Button href={feedbackUrl} style={baseStyles.button}>
          Ouvrir dans le tableau de bord
        </Button>
      </Section>
    </BaseLayout>
  );
}

export default NewFeedbackAlertEmail;
