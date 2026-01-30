import {
  Body,
  Container,
  Head,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { baseStyles } from "./styles";

interface BaseLayoutProps {
  preview: string;
  children: React.ReactNode;
}

export function BaseLayout({ preview, children }: BaseLayoutProps) {
  return (
    <Html lang="fr">
      <Head>
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600&family=Instrument+Serif&display=swap"
          rel="stylesheet"
        />
      </Head>
      <Preview>{preview}</Preview>
      <Body style={baseStyles.body}>
        <Container style={baseStyles.container}>
          <Section style={baseStyles.header}>
            <Text style={baseStyles.wordmark}>Reflet</Text>
          </Section>
          <Section style={baseStyles.content}>{children}</Section>
          <Section style={baseStyles.footer}>
            <Text style={baseStyles.footerBrand}>Reflet</Text>
            <Text style={baseStyles.footerText}>
              Des questions ?{" "}
              <Link
                href="mailto:support@reflet.app"
                style={baseStyles.footerLink}
              >
                Contactez-nous
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
