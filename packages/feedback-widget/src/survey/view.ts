import { safeLinkUrl } from "@reflet/survey-core";
import type {
  SurveySession,
  SurveySessionSnapshot,
} from "@reflet/survey-core/client";
import type { OtherChoice } from "./inputs";
import { renderStep, stepKeyOf } from "./markup";
import { otherFromAnswer, selectOption, typeOther } from "./selection";
import { syncQuestionView } from "./sync";

const AUTO_CLOSE_DELAY_MS = 5000;
const DIGIT_KEY = /^[0-9]$/;
const ROVING_STEP_BY_KEY: Record<string, number> = {
  ArrowDown: 1,
  ArrowLeft: -1,
  ArrowRight: 1,
  ArrowUp: -1,
};
const FOCUS_ORDER = [
  "[data-autofocus]",
  '[role="radio"][aria-checked="true"]',
  '[role="radio"], [role="checkbox"]',
  "[data-primary]",
  ".reflet-survey-close",
];

const activeElementOf = (node: Node): Element | null =>
  node instanceof ShadowRoot || node instanceof Document
    ? node.activeElement
    : null;

/** Renders a `SurveySession` into `container` and turns respondent input into session calls. */
export class SurveyView {
  private readonly container: HTMLElement;
  private readonly session: SurveySession;
  private readonly onClose: () => void;
  private readonly stage: HTMLElement;
  private readonly announcer: HTMLElement;
  private readonly unsubscribe: () => void;
  private readonly previousFocus: Element | null;
  private other: OtherChoice = { selected: false, text: "" };
  private stepKey = "";
  private autoCloseTimer: number | undefined;
  private isClosed = false;

  constructor(options: {
    container: HTMLElement;
    onClose: () => void;
    session: SurveySession;
  }) {
    this.container = options.container;
    this.session = options.session;
    this.onClose = options.onClose;
    this.previousFocus = document.activeElement;
    const position = this.session.survey.display.position ?? "bottom_right";
    this.container.className = `reflet-survey-overlay reflet-survey-${position}`;
    this.stage = document.createElement("div");
    this.stage.className = "reflet-survey-stage";
    this.announcer = document.createElement("p");
    this.announcer.className = "reflet-sr-only";
    this.announcer.setAttribute("aria-live", "polite");
    if (this.isModal) {
      const backdrop = document.createElement("div");
      backdrop.className = "reflet-survey-backdrop";
      this.container.append(backdrop);
    }
    this.container.append(this.stage, this.announcer);
    this.container.addEventListener("click", this.handleClick);
    this.container.addEventListener("input", this.handleInput);
    this.container.addEventListener("keydown", this.handleKeyDown);
    this.unsubscribe = this.session.subscribe(this.render);
    this.render();
  }

  dismiss(): void {
    if (this.session.getSnapshot().phase === "ending") {
      this.close();
      return;
    }
    this.session.dismiss();
  }

  destroy(): void {
    this.unsubscribe();
    window.clearTimeout(this.autoCloseTimer);
    this.container.removeEventListener("click", this.handleClick);
    this.container.removeEventListener("input", this.handleInput);
    this.container.removeEventListener("keydown", this.handleKeyDown);
    const hadFocus = this.container.contains(
      activeElementOf(this.container.getRootNode())
    );
    if (hadFocus && this.previousFocus instanceof HTMLElement) {
      this.previousFocus.focus();
    }
  }

  private get isModal(): boolean {
    return this.session.survey.display.position === "center";
  }

  private readonly render = (): void => {
    const snapshot = this.session.getSnapshot();
    if (snapshot.phase === "dismissed") {
      this.close();
      return;
    }
    const stepKey = stepKeyOf(snapshot);
    const isNewStep = stepKey !== this.stepKey;
    const shouldFocus =
      isNewStep &&
      (this.stepKey === ""
        ? this.isModal
        : this.container.contains(
            activeElementOf(this.container.getRootNode())
          ));
    if (isNewStep) {
      this.showStep(snapshot, stepKey);
    }
    if (snapshot.question) {
      syncQuestionView(this.stage, snapshot, snapshot.question, this.other);
    }
    if (shouldFocus) {
      this.focusStep();
    }
  };

  private showStep(snapshot: SurveySessionSnapshot, stepKey: string): void {
    this.stepKey = stepKey;
    if (snapshot.question) {
      this.other = otherFromAnswer(
        snapshot.question,
        snapshot.answers.get(snapshot.question._id)
      );
    }
    this.stage.innerHTML = renderStep(this.session, snapshot, this.other);
    this.announcer.textContent =
      snapshot.question?.title ?? snapshot.ending?.title ?? "";
    window.clearTimeout(this.autoCloseTimer);
    if (snapshot.ending && !safeLinkUrl(snapshot.ending.buttonUrl)) {
      this.autoCloseTimer = window.setTimeout(
        () => this.close(),
        AUTO_CLOSE_DELAY_MS
      );
    }
  }

  private focusStep(): void {
    for (const selector of FOCUS_ORDER) {
      const element = this.stage.querySelector<HTMLElement>(selector);
      if (element) {
        element.focus();
        return;
      }
    }
  }

  private select(kind: string, value: string): void {
    const { isSubmitting, question, answers } = this.session.getSnapshot();
    if (!question || isSubmitting) {
      return;
    }
    const selection = selectOption(
      question,
      answers.get(question._id),
      this.other,
      { kind, value }
    );
    if (!selection) {
      return;
    }
    this.other = selection.other;
    this.session.setAnswer(selection.answer);
    if (kind === "other" && this.other.selected) {
      this.stage
        .querySelector<HTMLInputElement>("[data-other-answer]")
        ?.focus();
    }
    if (selection.autoAdvance) {
      this.session.next();
    }
  }

  private runAction(action: string | undefined): void {
    switch (action) {
      case "dismiss":
        this.dismiss();
        return;
      case "back":
        this.session.back();
        return;
      case "next":
        this.session.next();
        return;
      case "retry":
        this.session.start();
        return;
      case "close":
        this.close();
        return;
      default:
        return;
    }
  }

  private close(): void {
    if (this.isClosed) {
      return;
    }
    this.isClosed = true;
    this.onClose();
  }

  private readonly handleClick = (event: MouseEvent): void => {
    const target =
      event.target instanceof Element
        ? event.target.closest<HTMLElement>("[data-action], [data-select]")
        : null;
    if (!target) {
      return;
    }
    const kind = target.dataset.select;
    if (kind) {
      this.select(kind, target.dataset.value ?? "");
      return;
    }
    this.runAction(target.dataset.action);
  };

  private readonly handleInput = (event: Event): void => {
    const { question, answers } = this.session.getSnapshot();
    const target = event.target;
    if (!question) {
      return;
    }
    if (target instanceof HTMLTextAreaElement) {
      this.session.setAnswer(target.value === "" ? undefined : target.value);
      return;
    }
    if (target instanceof HTMLInputElement && "otherAnswer" in target.dataset) {
      const selection = typeOther(
        question,
        answers.get(question._id),
        target.value
      );
      this.other = selection.other;
      this.session.setAnswer(selection.answer);
    }
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      this.dismiss();
      return;
    }
    if (event.key === "Enter") {
      this.handleEnter(event, target);
      return;
    }
    const rovingStep = ROVING_STEP_BY_KEY[event.key];
    const group = target?.closest("[data-roving]");
    if (rovingStep && target && group) {
      event.preventDefault();
      const radios = [...group.querySelectorAll<HTMLElement>('[role="radio"]')];
      const index = radios.indexOf(target);
      radios.at((index + rovingStep) % radios.length)?.focus();
      return;
    }
    const { question } = this.session.getSnapshot();
    const takesDigits = question?.type === "rating" || question?.type === "nps";
    const isTyping =
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement;
    if (takesDigits && !isTyping && DIGIT_KEY.test(event.key)) {
      const option = this.stage.querySelector(
        `[data-select="scale"][data-value="${event.key}"]`
      );
      if (option) {
        event.preventDefault();
        this.select("scale", event.key);
      }
    }
  };

  private handleEnter(event: KeyboardEvent, target: HTMLElement | null): void {
    const isNewline =
      target instanceof HTMLTextAreaElement &&
      !(event.metaKey || event.ctrlKey);
    const activatesItself =
      target instanceof HTMLButtonElement ||
      target instanceof HTMLAnchorElement;
    if (isNewline || activatesItself || event.isComposing) {
      return;
    }
    event.preventDefault();
    const { phase } = this.session.getSnapshot();
    if (phase === "question") {
      this.session.next();
    } else if (phase === "ending") {
      this.close();
    } else if (phase === "start_failed") {
      this.session.start();
    }
  }
}
