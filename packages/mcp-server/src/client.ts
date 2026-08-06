import { ContentApi } from "./client-content.js";
import type {
  CreatedResponse,
  DuplicatePairResponse,
  InvitationResponse,
  MemberResponse,
  OrganizationResponse,
  ScreenshotResponse,
  SuccessResponse,
  SurveyAnalyticsResponse,
  SurveyDetailResponse,
  SurveyListItem,
  SurveyResponseItem,
} from "./types.js";

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
    triggerConfig?: {
      pageUrl?: string;
      delayMs?: number;
      sampleRate?: number;
    };
    questions: Array<{
      type: string;
      title: string;
      description?: string;
      required?: boolean;
      order?: number;
      config?: {
        minValue?: number;
        maxValue?: number;
        minLabel?: string;
        maxLabel?: string;
        choices?: string[];
        placeholder?: string;
        maxLength?: number;
      };
    }>;
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
    triggerConfig?: {
      pageUrl?: string;
      delayMs?: number;
      sampleRate?: number;
    };
    maxResponses?: number;
  }): Promise<null> {
    return this.request("POST", "/api/v1/admin/survey/update", params);
  }

  listSurveyResponses(
    surveyId: string,
    params?: {
      status?: "started" | "completed" | "abandoned";
      limit?: number;
    }
  ): Promise<SurveyResponseItem[]> {
    const searchParams = new URLSearchParams();
    searchParams.set("id", surveyId);
    if (params?.status) {
      searchParams.set("status", params.status);
    }
    if (params?.limit) {
      searchParams.set("limit", String(params.limit));
    }
    return this.request(
      "GET",
      `/api/v1/admin/survey/responses?${searchParams}`
    );
  }
}
