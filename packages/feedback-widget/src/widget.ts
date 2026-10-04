import { capturePageScreenshot, getPageUrl } from "./screenshot";
import { WidgetCore } from "./widget-core";

export class RefletFeedbackWidget extends WidgetCore {
  protected async loadFeedback(): Promise<void> {
    try {
      const result = await this.api.listFeedback({
        limit: 50,
        sortBy: "votes",
      });
      this.state.feedbackItems = result.items;
      this.state.isLoading = false;
      this.render();
    } catch (error) {
      this.state.error =
        error instanceof Error ? error.message : "Failed to load feedback";
      this.state.isLoading = false;
      this.render();
    }
  }

  protected async openFeedbackDetail(feedbackId: string): Promise<void> {
    const feedback = this.state.feedbackItems.find((f) => f.id === feedbackId);
    if (!feedback) {
      return;
    }

    this.state.selectedFeedback = feedback;
    this.state.view = "detail";
    this.state.isLoading = true;
    this.render();

    try {
      const comments = await this.api.getComments(feedbackId);
      this.state.selectedFeedbackComments = comments;
    } catch {
      // Ignore error, just show no comments
      this.state.selectedFeedbackComments = [];
    }

    this.state.isLoading = false;
    this.render();
  }

  protected async handleVote(feedbackId: string): Promise<void> {
    try {
      const result = await this.api.vote(feedbackId);

      // Update local state
      const feedback = this.state.feedbackItems.find(
        (f) => f.id === feedbackId
      );
      if (feedback) {
        feedback.hasVoted = result.voted;
        feedback.voteCount = result.voteCount;
      }

      this.config.onVote?.(feedbackId, result.voted);
      this.render();
    } catch (error) {
      // Show login prompt if not authenticated
      if (error instanceof Error && error.message.includes("identification")) {
        if (this.config.loginUrl) {
          this.handleAction("login");
        } else {
          this.state.error = "Please sign in to vote";
          this.render();
        }
      }
    }
  }

  protected async handleCreateSubmit(): Promise<void> {
    if (!this.shadowRoot) {
      return;
    }

    const titleInput = this.shadowRoot.querySelector("#feedback-title");
    const descInput = this.shadowRoot.querySelector("#feedback-description");

    if (
      !(
        titleInput instanceof HTMLInputElement &&
        descInput instanceof HTMLTextAreaElement
      )
    ) {
      return;
    }

    const title = titleInput.value.trim();
    const description = descInput.value.trim();

    if (!(title && description)) {
      return;
    }

    try {
      const result = await this.api.createFeedback({ description, title });

      // Upload screenshot if one was captured
      if (this.pendingScreenshot) {
        try {
          const storageId = await this.api.uploadScreenshot(
            this.pendingScreenshot
          );
          await this.api.saveScreenshot({
            feedbackId: result.feedbackId,
            filename: "screenshot.png",
            mimeType: "image/png",
            pageUrl: getPageUrl(),
            size: this.pendingScreenshot.size,
            storageId,
          });
        } catch {
          // Screenshot upload failed, but feedback was created
        }
        this.pendingScreenshot = null;
      }

      this.config.onFeedbackCreated?.({ id: result.feedbackId, title });
      this.surveys.notifyFeedbackSubmitted();

      // Refresh list and go back
      await this.loadFeedback();
      this.state.view = "list";
      this.render();
    } catch (error) {
      this.state.error =
        error instanceof Error ? error.message : "Failed to submit feedback";
      this.render();
    }
  }

  protected async handleCommentSubmit(): Promise<void> {
    if (!(this.shadowRoot && this.state.selectedFeedback)) {
      return;
    }

    const input = this.shadowRoot.querySelector("#comment-input");
    if (!(input instanceof HTMLTextAreaElement)) {
      return;
    }

    const body = input.value.trim();
    if (!body) {
      return;
    }

    try {
      await this.api.addComment(this.state.selectedFeedback.id, body);

      // Refresh comments
      const comments = await this.api.getComments(
        this.state.selectedFeedback.id
      );
      this.state.selectedFeedbackComments = comments;
      this.render();

      // Clear input
      const newInput = this.shadowRoot.querySelector("#comment-input");
      if (newInput instanceof HTMLTextAreaElement) {
        newInput.value = "";
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("identification")) {
        if (this.config.loginUrl) {
          this.handleAction("login");
        } else {
          this.state.error = "Please sign in to comment";
          this.render();
        }
      }
    }
  }

  protected async handleScreenshotCapture(): Promise<void> {
    // Temporarily hide widget to capture clean page
    if (this.container) {
      this.container.style.display = "none";
    }

    const screenshot = await capturePageScreenshot();

    if (this.container) {
      this.container.style.display = "";
    }

    if (screenshot) {
      this.pendingScreenshot = screenshot;

      // Show visual feedback that screenshot was captured
      if (this.shadowRoot) {
        const screenshotBtn = this.shadowRoot.querySelector(
          '[data-action="screenshot"]'
        );
        if (screenshotBtn) {
          screenshotBtn.textContent = "✓ Screenshot captured";
          screenshotBtn.classList.add("reflet-screenshot-captured");
        }
      }
    }
  }

  /** Records a custom event; surveys triggered by it show when eligible. */
  track(eventName: string): void {
    this.surveys.track(eventName);
  }

  /** Shows a survey by id (including manual ones). Resolves false when it can't be shown now. */
  showSurvey(surveyId: string): Promise<boolean> {
    return this.surveys.show(surveyId);
  }

  dismissSurvey(): void {
    this.surveys.dismiss();
  }
}
