import { Button, Heading, Link, Section, Text } from "react-email";
import { BaseLayout } from "./base-layout";
import { baseStyles } from "./styles";

type IncidentStatus =
  | "investigating"
  | "identified"
  | "monitoring"
  | "resolved";
type IncidentSeverity = "minor" | "major" | "critical";

interface StatusIncidentEmailProps {
  affectedMonitorNames?: string[];
  message?: string;
  organizationName?: string;
  severity?: IncidentSeverity;
  status?: IncidentStatus;
  statusPageUrl?: string;
  title?: string;
  unsubscribeUrl?: string;
}

const STATUS_LABELS: Record<IncidentStatus, string> = {
  identified: "Cause identifiée",
  investigating: "En cours d'analyse",
  monitoring: "Sous surveillance",
  resolved: "Résolu",
};

const SEVERITY_LABELS: Record<IncidentSeverity, string> = {
  critical: "critique",
  major: "majeur",
  minor: "mineur",
};

export function StatusIncidentEmail({
  affectedMonitorNames = ["API"],
  message = "Nous analysons une hausse des erreurs sur l'API.",
  organizationName = "Mon Organisation",
  severity = "major",
  status = "investigating",
  statusPageUrl = "https://example.com/status",
  title = "Erreurs sur l'API",
  unsubscribeUrl = "https://example.com/unsubscribe",
}: StatusIncidentEmailProps) {
  const statusLabel = STATUS_LABELS[status];

  return (
    <BaseLayout preview={`${organizationName} · ${statusLabel} : ${title}`}>
      <Heading style={baseStyles.heading}>{title}</Heading>
      <Text style={baseStyles.paragraph}>
        <strong>{statusLabel}</strong> · Incident {SEVERITY_LABELS[severity]}{" "}
        chez <strong>{organizationName}</strong>
      </Text>
      <Text style={baseStyles.paragraph}>{message}</Text>
      {affectedMonitorNames.length > 0 ? (
        <Text style={baseStyles.paragraph}>
          Services concernés : {affectedMonitorNames.join(", ")}
        </Text>
      ) : null}
      <Section style={baseStyles.buttonWrapper}>
        <Button href={statusPageUrl} style={baseStyles.button}>
          Voir la page de statut
        </Button>
      </Section>
      <Section style={{ marginTop: "32px", textAlign: "center" as const }}>
        <Text style={baseStyles.disclaimer}>
          Vous recevez cet email car vous êtes abonné aux mises à jour de statut
          de {organizationName}.
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

export default StatusIncidentEmail;
