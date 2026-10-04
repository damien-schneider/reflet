import { ContentApi } from "./client-content";
import type {
  SurveyAnalyticsResponse,
  SurveyDetailResponse,
  SurveyDisplay,
  SurveyEnding,
  SurveyListItem,
  SurveyQuestionDraft,
  SurveyResponsePage,
  SurveyTriggerConfig,
} from "./survey-types";
import type {
  CreatedResponse,
  DuplicatePairResponse,
  InvitationResponse,
  MemberResponse,
  OrganizationResponse,
  ScreenshotResponse,
  SuccessResponse,
} from "./types";

export class RefletAdminClient extends ContentApi {
  listMembers(): Promise<MemberResponse[]> {
    return this.request("GET", "/api/v1/admin/members");
  }

  createInvitation(params: {
    email: string;
    role: "admin" | "member";
  }): Promise<CreatedResponse> {
    return this.request("POST", "/api/v1/admin/invitation/create", params);
  }

  cancelInvitation(invitationId: string): Promise<SuccessResponse> {
    return this.request("POST", "/api/v1/admin/invitation/cancel", {
      invitationId,
    });
  }

  listInvitations(): Promise<InvitationResponse[]> {
    return this.request("GET", "/api/v1/admin/invitations");
  }

  getOrganization(): Promise<OrganizationResponse | null> {
    return this.request("GET", "/api/v1/admin/organization");
  }

  updateOrganization(params: {
    name?: string;
    isPublic?: boolean;
    primaryColor?: string;
    supportEnabled?: boolean;
  }): Promise<SuccessResponse> {
    return this.request("POST", "/api/v1/admin/organization/update", params);
  }

  listPendingDuplicates(): Promise<DuplicatePairResponse[]> {
    return this.request("GET", "/api/v1/admin/duplicates");
  }

  resolveDuplicate(params: {
    pairId: string;
    action: "confirm" | "reject";
  }): Promise<null> {
    return this.request("POST", "/api/v1/admin/duplicate/resolve", params);
  }

  mergeFeedback(params: {
    sourceFeedbackId: string;
    targetFeedbackId: string;
    pairId?: string;
  }): Promise<null> {
    return this.request("POST", "/api/v1/admin/duplicate/merge", params);
  }

  listScreenshots(feedbackId: string): Promise<ScreenshotResponse[]> {
    return this.request(
      "GET",
      `/api/v1/admin/screenshots?feedbackId=${encodeURIComponent(feedbackId)}`
    );
  }

  deleteScreenshot(screenshotId: string): Promise<null> {
    return this.request("POST", "/api/v1/admin/screenshot/delete", {
      screenshotId,
    });
  }

  listSurveys(params?: {
    status?: "draft" | "active" | "paused" | "closed";
  }): Promise<SurveyListItem[]> {
    const query = this.buildQuery(params ?? {});
    return this.request("GET", `/api/v1/admin/surveys${query}`);
  }

  getSurvey(surveyId: string): Promise<SurveyDetailResponse | null> {
    return this.request(
      "GET",
      `/api/v1/admin/survey?id=${encodeURIComponent(surveyId)}`
    );
  }

  createSurvey(params: {
    title: string;
    description?: string;
    triggerType: string;
    triggerConfig?: SurveyTriggerConfig;
    display?: SurveyDisplay;
    endings?: SurveyEnding[];
    questions: SurveyQuestionDraft[];
  }): Promise<string> {
    return this.request("POST", "/api/v1/admin/survey/create", params);
  }

  updateSurveyStatus(
    surveyId: string,
    status: "draft" | "active" | "paused" | "closed"
  ): Promise<null> {
    return this.request("POST", "/api/v1/admin/survey/update-status", {
      status,
      surveyId,
    });
  }

  deleteSurvey(surveyId: string): Promise<null> {
    return this.request("POST", "/api/v1/admin/survey/delete", {
      surveyId,
    });
  }

  getSurveyAnalytics(surveyId: string): Promise<SurveyAnalyticsResponse> {
    return this.request(
      "GET",
      `/api/v1/admin/survey/analytics?id=${encodeURIComponent(surveyId)}`
    );
  }

  duplicateSurvey(surveyId: string, title?: string): Promise<string> {
    return this.request("POST", "/api/v1/admin/survey/duplicate", {
      surveyId,
      title,
    });
  }

  updateSurvey(params: {
    surveyId: string;
    title?: string;
    description?: string;
    triggerType?: string;
    triggerConfig?: SurveyTriggerConfig;
    display?: SurveyDisplay;
    endings?: SurveyEnding[];
    linkEnabled?: boolean;
    startsAt?: number | null;
    endsAt?: number | null;
    maxResponses?: number | null;
  }): Promise<null> {
    return this.request("POST", "/api/v1/admin/survey/update", params);
  }

  listSurveyResponses(
    surveyId: string,
    params?: {
      status?: "in_progress" | "completed" | "abandoned";
      limit?: number;
      cursor?: string;
    }
  ): Promise<SurveyResponsePage> {
    const searchParams = new URLSearchParams();
    searchParams.set("id", surveyId);
    if (params?.status) {
      searchParams.set("status", params.status);
    }
    if (params?.limit) {
      searchParams.set("limit", String(params.limit));
    }
    if (params?.cursor) {
      searchParams.set("cursor", params.cursor);
    }
    return this.request(
      "GET",
      `/api/v1/admin/survey/responses?${searchParams}`
    );
  }
}
