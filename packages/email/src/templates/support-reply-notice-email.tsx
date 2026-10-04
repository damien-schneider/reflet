import { Button, Heading, Hr, Link, Section, Text } from "react-email";
import { baseStyles } from "./styles";
import { SupportLayout } from "./support-layout";

interface SupportReplyNoticeEmailProps {
  organizationName?: string;
  threadUrl?: string;
}

export function SupportReplyNoticeEmail({
  organizationName = "Acme",
  threadUrl = "https://www.reflet.app/acme/support/t/token",
}: SupportReplyNoticeEmailProps) {
  return (
    <SupportLayout
      organizationName={organizationName}
      preview={`${organizationName} replied to you`}
      showReplyMarker
    >
      <Heading style={baseStyles.heading}>
        {organizationName} replied to you
      </Heading>
      <Text style={baseStyles.paragraph}>
        You have a new reply to your support request. Open the conversation to
        read it, or reply to this email.
      </Text>
      <Section style={baseStyles.buttonWrapper}>
        <Button href={threadUrl} style={baseStyles.button}>
          View the conversation
        </Button>
      </Section>
      <Text style={baseStyles.linkText}>
        If the button does not work, copy this link into your browser:
      </Text>
      <Link href={threadUrl} style={baseStyles.link}>
        {threadUrl}
      </Link>
      <Hr style={baseStyles.hr} />
      <Text style={baseStyles.disclaimer}>
        You can turn off these emails from the conversation page.
      </Text>
    </SupportLayout>
  );
}

export default SupportReplyNoticeEmail;
