import { Hr, Link, Text } from "react-email";
import { baseStyles } from "./styles";
import { SupportLayout } from "./support-layout";

const PARAGRAPH_BREAK = /\n\s*\n/;

const bodyParagraphStyle = {
  ...baseStyles.paragraph,
  whiteSpace: "pre-wrap" as const,
};

interface SupportReplyEmailProps {
  authorName?: string;
  body?: string;
  organizationName?: string;
  threadUrl?: string;
}

export function SupportReplyEmail({
  authorName,
  body = "Thanks for reaching out. We fixed the checkout issue you reported.",
  organizationName = "Acme",
  threadUrl = "https://www.reflet.app/acme/support/t/token",
}: SupportReplyEmailProps) {
  const signature = authorName
    ? `— ${authorName}, ${organizationName}`
    : `— ${organizationName}`;

  return (
    <SupportLayout
      organizationName={organizationName}
      preview={body.slice(0, 140)}
      showReplyMarker
    >
      {body.split(PARAGRAPH_BREAK).map((paragraph, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: paragraphs are static and never reordered
        <Text key={index} style={bodyParagraphStyle}>
          {paragraph}
        </Text>
      ))}
      <Text style={baseStyles.paragraph}>{signature}</Text>
      <Hr style={baseStyles.hr} />
      <Text style={baseStyles.disclaimer}>
        Reply to this email or{" "}
        <Link href={threadUrl} style={baseStyles.link}>
          view the conversation
        </Link>
        .
      </Text>
    </SupportLayout>
  );
}

export default SupportReplyEmail;
