import {
  Body,
  Container,
  Head,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "react-email";
import { baseStyles, colors, fonts } from "./styles";

export const SUPPORT_REPLY_MARKER = "##- Reply above this line -##";

const supportStyles = {
  organizationName: {
    color: colors.foreground,
    fontFamily: fonts.sans,
    fontSize: "16px",
    fontWeight: "600" as const,
    margin: 0,
  },
  replyMarker: {
    color: colors.mutedForeground,
    fontFamily: fonts.sans,
    fontSize: "12px",
    margin: "0 0 16px",
    textAlign: "center" as const,
  },
} as const;

interface SupportLayoutProps {
  children: React.ReactNode;
  organizationName: string;
  preview: string;
  showReplyMarker?: boolean;
}

export function SupportLayout({
  children,
  organizationName,
  preview,
  showReplyMarker = false,
}: SupportLayoutProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={baseStyles.body}>
        {showReplyMarker ? (
          <Text style={supportStyles.replyMarker}>{SUPPORT_REPLY_MARKER}</Text>
        ) : null}
        <Container style={baseStyles.container}>
          <Section style={baseStyles.header}>
            <Text style={supportStyles.organizationName}>
              {organizationName}
            </Text>
          </Section>
          <Section style={baseStyles.content}>{children}</Section>
          <Section style={baseStyles.footer}>
            <Text style={baseStyles.footerText}>
              Sent via{" "}
              <Link href="https://www.reflet.app" style={baseStyles.footerLink}>
                Reflet
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
