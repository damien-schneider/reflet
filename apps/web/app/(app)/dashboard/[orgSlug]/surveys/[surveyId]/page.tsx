"use client";

import SurveyDetailPage from "@/features/surveys/components/survey-detail-page";

export default function Page(
  props: React.ComponentProps<typeof SurveyDetailPage>
) {
  return <SurveyDetailPage {...props} />;
}
