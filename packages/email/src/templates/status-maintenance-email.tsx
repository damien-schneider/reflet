import { Button, Heading, Link, Section, Text } from "react-email";
import { BaseLayout } from "./base-layout";
import { baseStyles } from "./styles";

interface StatusMaintenanceEmailProps {
  affectedMonitorNames?: string[];
  endsAt?: number;
  message?: string;
  organizationName?: string;
  startsAt?: number;
  statusPageUrl?: string;
  title?: string;
  unsubscribeUrl?: string;
}

const PREVIEW_STARTS_AT = Date.UTC(2026, 0, 15, 22, 0);
const PREVIEW_DURATION_MS = 2 * 60 * 60 * 1000;

const maintenanceDateFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  month: "long",
  timeZone: "Europe/Paris",
  timeZoneName: "short",
  year: "numeric",
});

export function StatusMaintenanceEmail({
  affectedMonitorNames = ["API"],
  endsAt = PREVIEW_STARTS_AT + PREVIEW_DURATION_MS,
  message = "Nous migrons notre base de données vers une infrastructure plus rapide.",
  organizationName = "Mon Organisation",
  startsAt = PREVIEW_STARTS_AT,
  statusPageUrl = "https://example.com/status",
  title = "Migration de la base de données",
  unsubscribeUrl = "https://example.com/unsubscribe",
}: StatusMaintenanceEmailProps) {
  const schedule = `du ${maintenanceDateFormat.format(startsAt)} au ${maintenanceDateFormat.format(endsAt)} (heure de Paris)`;

  return (
    <BaseLayout
      preview={`${organizationName} · Maintenance planifiée : ${title}`}
    >
      <Heading style={baseStyles.heading}>{title}</Heading>
      <Text style={baseStyles.paragraph}>
        <strong>Maintenance planifiée</strong> chez{" "}
        <strong>{organizationName}</strong>, {schedule}.
      </Text>
      {message ? <Text style={baseStyles.paragraph}>{message}</Text> : null}
      <Text style={baseStyles.paragraph}>
        Services concernés :{" "}
        {affectedMonitorNames.length > 0
          ? affectedMonitorNames.join(", ")
          : "tous les services"}
      </Text>
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

export default StatusMaintenanceEmail;
