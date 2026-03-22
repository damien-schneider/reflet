import { Button, Heading, Link, Section, Text } from "@react-email/components";
import { BaseLayout } from "./base-layout";
import { baseStyles } from "./styles";

interface TopFeedbackItem {
  status: string;
  title: string;
  url: string;
  voteCount: number;
}

interface StatusChange {
  from: string;
  title: string;
  to: string;
}

interface WeeklyDigestEmailProps {
  dashboardUrl?: string;
  newFeedbackCount?: number;
  organizationName?: string;
  statusChanges?: StatusChange[];
  topFeedback?: TopFeedbackItem[];
  totalVotes?: number;
  unsubscribeUrl?: string;
}

export function WeeklyDigestEmail({
  organizationName = "Mon Organisation",
  newFeedbackCount = 0,
  totalVotes = 0,
  topFeedback = [],
  statusChanges = [],
  dashboardUrl = "https://example.com/dashboard",
  unsubscribeUrl = "https://example.com/unsubscribe",
}: WeeklyDigestEmailProps) {
  return (
    <BaseLayout
      preview={`${organizationName} - Digest hebdomadaire : ${newFeedbackCount} nouveaux retours`}
    >
      <Heading style={baseStyles.heading}>Digest hebdomadaire</Heading>
      <Text style={baseStyles.paragraph}>
        Voici le résumé de la semaine pour <strong>{organizationName}</strong>.
      </Text>

      <Section style={{ marginBottom: "24px" }}>
        <Text style={baseStyles.paragraph}>
          <strong>{newFeedbackCount}</strong> nouveaux retours &middot;{" "}
          <strong>{totalVotes}</strong> votes
        </Text>
      </Section>

      {topFeedback.length > 0 && (
        <Section style={{ marginBottom: "24px" }}>
          <Text style={{ ...baseStyles.paragraph, fontWeight: "bold" }}>
            Top retours
          </Text>
          {topFeedback.map((item) => (
            <Text key={item.title} style={baseStyles.paragraph}>
              {item.title} &middot; {item.voteCount} votes
            </Text>
          ))}
        </Section>
      )}

      {statusChanges.length > 0 && (
        <Section style={{ marginBottom: "24px" }}>
          <Text style={{ ...baseStyles.paragraph, fontWeight: "bold" }}>
            Changements de statut
          </Text>
          {statusChanges.map((change) => (
            <Text key={change.title} style={baseStyles.paragraph}>
              {change.title} &rarr; {change.to}
            </Text>
          ))}
        </Section>
      )}

      <Section style={baseStyles.buttonWrapper}>
        <Button href={dashboardUrl} style={baseStyles.button}>
          Voir le tableau de bord
        </Button>
      </Section>

      <Section style={{ marginTop: "32px", textAlign: "center" as const }}>
        <Text style={baseStyles.disclaimer}>
          Vous recevez cet email car vous êtes membre de {organizationName}.
        </Text>
        <Text style={baseStyles.disclaimer}>
          <Link href={unsubscribeUrl} style={baseStyles.footerLink}>
            Se désabonner
          </Link>
        </Text>
        <Text style={baseStyles.disclaimer}>Reflet · Paris, France</Text>
      </Section>
    </BaseLayout>
  );
}

export default WeeklyDigestEmail;
