import type { Metadata } from "next";
import { HostedSurvey } from "@/features/surveys/components/link/hosted-survey";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "Survey",
};

export default async function HostedSurveyPage({
  params,
}: {
  params: Promise<{ surveyId: string }>;
}) {
  const { surveyId } = await params;
  return <HostedSurvey surveyId={surveyId} />;
}
