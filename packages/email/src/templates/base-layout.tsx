import {
  Body,
  Container,
  Font,
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
        <Font
          fallbackFontFamily={["Helvetica", "Arial", "sans-serif"]}
          fontFamily="Instrument Sans"
          fontStyle="normal"
          fontWeight={400}
          webFont={{
            url: "https://fonts.gstatic.com/s/instrumentsans/v1/pximypc9vsFDm051Uf6KVwgkfoSxQ0GsQv8.woff2",
            format: "woff2",
          }}
        />
        <Font
          fallbackFontFamily={["Helvetica", "Arial", "sans-serif"]}
          fontFamily="Instrument Sans"
          fontStyle="normal"
          fontWeight={600}
          webFont={{
            url: "https://fonts.gstatic.com/s/instrumentsans/v1/pximypc9vsFDm051Uf6KVwgkfoSxQ0GsQv8.woff2",
            format: "woff2",
          }}
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
