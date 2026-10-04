import { Heading, Text } from "react-email";
import { baseStyles } from "./styles";
import { SupportLayout } from "./support-layout";

interface SupportForwardingTestEmailProps {
  organizationName?: string;
}

export function SupportForwardingTestEmail({
  organizationName = "Acme",
}: SupportForwardingTestEmailProps) {
  return (
    <SupportLayout
      organizationName={organizationName}
      preview="Reflet forwarding test"
    >
      <Heading style={baseStyles.heading}>Forwarding test</Heading>
      <Text style={baseStyles.paragraph}>
        Reflet sent this email to check that your support address forwards
        messages to your Reflet inbox. If forwarding works, the settings page
        will show it as verified within a minute.
      </Text>
      <Text style={baseStyles.disclaimer}>
        No action is needed. You can delete this email.
      </Text>
    </SupportLayout>
  );
}

export default SupportForwardingTestEmail;
