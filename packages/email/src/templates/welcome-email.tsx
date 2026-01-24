import { Button, Heading, Text } from "@react-email/components";
import { BaseLayout } from "./base-layout";

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
      <Heading style={styles.heading}>{greeting} !</Heading>
      <Text style={styles.paragraph}>
        Votre compte Reflet est maintenant actif. Vous pouvez commencer à
        utiliser toutes les fonctionnalités de la plateforme.
      </Text>
      <Text style={styles.paragraph}>Avec Reflet, vous pouvez :</Text>
      <ul style={styles.list}>
        <li style={styles.listItem}>
          Collecter les retours de vos utilisateurs
        </li>
        <li style={styles.listItem}>Organiser et prioriser les feedbacks</li>
        <li style={styles.listItem}>Créer une roadmap publique</li>
        <li style={styles.listItem}>
          Publier un changelog pour vos mises à jour
        </li>
      </ul>
      <Button href={dashboardUrl} style={styles.button}>
        Accéder au tableau de bord
      </Button>
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
    margin: "0 0 16px",
  },
  list: {
    color: "#3f3f46",
    fontSize: "16px",
    lineHeight: "24px",
    margin: "0 0 24px",
    paddingLeft: "24px",
  },
  listItem: {
    margin: "8px 0",
  },
  button: {
    backgroundColor: "#556b2f",
    borderRadius: "6px",
    color: "#ffffff",
    display: "inline-block",
    fontSize: "16px",
    fontWeight: "500",
    margin: "8px 0",
    padding: "14px 32px",
    textDecoration: "none",
  },
} as const;

export default WelcomeEmail;
