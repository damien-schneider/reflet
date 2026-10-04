import { Button, Heading, Hr, Link, Section, Text } from "react-email";
import { baseStyles } from "./styles";
import { SupportLayout } from "./support-layout";

interface SupportContactConfirmationEmailProps {
  confirmUrl?: string;
  organizationName?: string;
}

export function SupportContactConfirmationEmail({
  confirmUrl = "https://www.reflet.app/acme/support/confirm?token=token",
  organizationName = "Acme",
}: SupportContactConfirmationEmailProps) {
  return (
    <SupportLayout
      organizationName={organizationName}
      preview={`Confirm your email to get replies from ${organizationName}`}
    >
      <Heading style={baseStyles.heading}>Confirm your email</Heading>
      <Text style={baseStyles.paragraph}>
        We received your message to <strong>{organizationName}</strong>. Confirm
        this address to get notified of replies.
      </Text>
      <Section style={baseStyles.buttonWrapper}>
        <Button href={confirmUrl} style={baseStyles.button}>
          Confirm my email
        </Button>
      </Section>
      <Text style={baseStyles.linkText}>
        If the button does not work, copy this link into your browser:
      </Text>
      <Link href={confirmUrl} style={baseStyles.link}>
        {confirmUrl}
      </Link>
      <Hr style={baseStyles.hr} />
      <Text style={baseStyles.disclaimer}>
        If you did not contact {organizationName}, ignore this email.
      </Text>
    </SupportLayout>
  );
}

export default SupportContactConfirmationEmail;
