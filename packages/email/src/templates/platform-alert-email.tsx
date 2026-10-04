import { Heading, Text } from "react-email";
import { BaseLayout } from "./base-layout";
import { baseStyles } from "./styles";

interface PlatformAlertEmailProps {
  details: string[];
  title: string;
}

export function PlatformAlertEmail({
  details,
  title,
}: PlatformAlertEmailProps) {
  return (
    <BaseLayout preview={title}>
      <Heading style={baseStyles.heading}>{title}</Heading>
      {details.map((line) => (
        <Text key={line} style={baseStyles.paragraph}>
          {line}
        </Text>
      ))}
    </BaseLayout>
  );
}
