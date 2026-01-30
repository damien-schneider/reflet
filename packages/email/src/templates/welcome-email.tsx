import { Button, Heading, Section, Text } from "@react-email/components";
import { BaseLayout } from "./base-layout";
import { baseStyles } from "./styles";

interface WelcomeEmailProps {
  userName?: string;
  dashboardUrl?: string;
}

export function WelcomeEmail({
  userName,
  dashboardUrl = "/dashboard",
}: WelcomeEmailProps) {
  const greeting = userName ? `Bienvenue ${userName}` : "Bienvenue";

  return (
    <BaseLayout preview="Bienvenue sur Reflet - Votre compte est maintenant actif">
      <Heading style={baseStyles.heading}>{greeting}</Heading>
      <Text style={baseStyles.paragraph}>
        Votre compte Reflet est maintenant actif. Vous pouvez commencer à
        utiliser toutes les fonctionnalités de la plateforme.
      </Text>
      <Text style={baseStyles.paragraph}>Avec Reflet, vous pouvez :</Text>
      <ul style={baseStyles.list}>
        <li style={baseStyles.listItem}>
          Collecter les retours de vos utilisateurs
        </li>
        <li style={baseStyles.listItem}>
          Organiser et prioriser les feedbacks
        </li>
        <li style={baseStyles.listItem}>Créer une roadmap publique</li>
        <li style={baseStyles.listItem}>
          Publier un changelog pour vos mises à jour
        </li>
      </ul>
      <Section style={baseStyles.buttonWrapper}>
        <Button href={dashboardUrl} style={baseStyles.button}>
          Accéder au tableau de bord
        </Button>
      </Section>
    </BaseLayout>
  );
}

export default WelcomeEmail;
