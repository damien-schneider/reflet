import {
  Button,
  Heading,
  Hr,
  Link,
  Section,
  Text,
} from "@react-email/components";
import { BaseLayout } from "./base-layout";
import { baseStyles, colors } from "./styles";

interface FeedbackSummary {
  title: string;
  voteCount: number;
  status: string;
  url: string;
}

interface WeeklyDigestEmailProps {
  organizationName?: string;
  newFeedbackCount?: number;
  totalVotes?: number;
  topFeedback?: FeedbackSummary[];
  statusChanges?: { title: string; from: string; to: string }[];
  dashboardUrl?: string;
  unsubscribeUrl?: string;
}

export function WeeklyDigestEmail({
  organizationName = "My Organization",
  newFeedbackCount = 5,
  totalVotes = 23,
  topFeedback = [
    {
      title: "Dark mode support",
      voteCount: 12,
      status: "planned",
      url: "#",
    },
    {
      title: "Export to CSV",
      voteCount: 8,
      status: "open",
      url: "#",
    },
  ],
  statusChanges = [
    { title: "API rate limiting", from: "planned", to: "in_progress" },
  ],
  dashboardUrl = "https://reflet.app/dashboard",
  unsubscribeUrl = "https://reflet.app/unsubscribe",
}: WeeklyDigestEmailProps) {
  return (
    <BaseLayout
      preview={`${organizationName} weekly digest: ${newFeedbackCount} new requests, ${totalVotes} votes`}
    >
      <Heading style={baseStyles.heading}>Weekly Digest</Heading>
      <Text style={baseStyles.paragraph}>
        Here&apos;s what happened with <strong>{organizationName}</strong> this
        week.
      </Text>

      <Section
        style={{
          backgroundColor: colors.muted,
          borderRadius: "8px",
          padding: "16px 20px",
          marginBottom: "24px",
        }}
      >
        <Text
          style={{
            ...baseStyles.paragraph,
            margin: "0 0 4px",
            fontSize: "14px",
          }}
        >
          <strong>{newFeedbackCount}</strong> new feedback items
        </Text>
        <Text style={{ ...baseStyles.paragraph, margin: 0, fontSize: "14px" }}>
          <strong>{totalVotes}</strong> total votes this week
        </Text>
      </Section>

      {topFeedback.length > 0 && (
        <>
          <Text
            style={{
              ...baseStyles.paragraph,
              fontWeight: "600",
              marginBottom: "8px",
            }}
          >
            Top Requests
          </Text>
          {topFeedback.map((item) => (
            <Section
              key={item.title}
              style={{
                borderBottom: `1px solid ${colors.border}`,
                paddingBottom: "12px",
                marginBottom: "12px",
              }}
            >
              <Text style={{ ...baseStyles.paragraph, margin: "0 0 4px" }}>
                <Link href={item.url} style={{ color: colors.olive[600] }}>
                  {item.title}
                </Link>
              </Text>
              <Text
                style={{
                  ...baseStyles.disclaimer,
                  margin: 0,
                }}
              >
                {item.voteCount} votes · {item.status.replace("_", " ")}
              </Text>
            </Section>
          ))}
        </>
      )}

      {statusChanges.length > 0 && (
        <>
          <Hr style={baseStyles.hr} />
          <Text
            style={{
              ...baseStyles.paragraph,
              fontWeight: "600",
              marginBottom: "8px",
            }}
          >
            Status Updates
          </Text>
          {statusChanges.map((change) => (
            <Text
              key={change.title}
              style={{ ...baseStyles.paragraph, fontSize: "14px" }}
            >
              <strong>{change.title}</strong>: {change.from.replace("_", " ")} →{" "}
              {change.to.replace("_", " ")}
            </Text>
          ))}
        </>
      )}

      <Section style={baseStyles.buttonWrapper}>
        <Button href={dashboardUrl} style={baseStyles.button}>
          View Dashboard
        </Button>
      </Section>

      <Section style={{ marginTop: "32px", textAlign: "center" as const }}>
        <Text style={baseStyles.disclaimer}>
          You&apos;re receiving this because you&apos;re a member of{" "}
          {organizationName}.
        </Text>
        <Text style={baseStyles.disclaimer}>
          <Link href={unsubscribeUrl} style={baseStyles.footerLink}>
            Unsubscribe from weekly digests
          </Link>
        </Text>
      </Section>
    </BaseLayout>
  );
}

export default WeeklyDigestEmail;
