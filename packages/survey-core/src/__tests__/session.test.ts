import { describe, expect, it, vi } from "vitest";
import {
  REQUIRED_ANSWER_MESSAGE,
  SAVE_FAILED_MESSAGE,
  SurveySession,
  type SurveyTransport,
} from "../session";
import { npsSurvey, question } from "./fixtures";

const recordingTransport = () => {
  const calls: string[] = [];
  const transport: SurveyTransport = {
    answer: vi.fn(({ questionId, value }) => {
      calls.push(`answer ${questionId}=${JSON.stringify(value)}`);
      return Promise.resolve();
    }),
    complete: vi.fn(() => {
      calls.push("complete");
      return Promise.resolve();
    }),
    dismiss: vi.fn(() => {
      calls.push("dismiss");
      return Promise.resolve();
    }),
    start: vi.fn(() => {
      calls.push("start");
      return Promise.resolve({ responseId: "r1" });
    }),
  };
  return { calls, transport };
};

const startedSession = async (transport: SurveyTransport) => {
  const onComplete = vi.fn();
  const session = new SurveySession({
    callbacks: { onComplete },
    survey: npsSurvey(),
    transport,
  });
  await session.start();
  return { onComplete, session };
};

const currentId = (session: SurveySession) =>
  session.getSnapshot().question?._id;

describe("SurveySession", () => {
  it("follows the branch the answer picks and ends on that branch's ending", async () => {
    const { calls, transport } = recordingTransport();
    const { onComplete, session } = await startedSession(transport);

    session.setAnswer(3);
    await session.next();
    expect(currentId(session)).toBe("detractor");
    expect(session.getSnapshot().isLastStep).toBe(true);

    session.setAnswer("Too slow");
    await session.next();

    expect(session.getSnapshot()).toMatchObject({
      ending: { id: "sorry" },
      phase: "ending",
      progress: 1,
    });
    expect(calls).toEqual([
      "start",
      "answer nps=3",
      'answer detractor="Too slow"',
      "complete",
    ]);
    expect(onComplete).toHaveBeenCalledWith({
      endingId: "sorry",
      responseId: "r1",
      surveyId: "survey-1",
    });
  });

  it("goes back to the question actually visited, not the previous one in order", async () => {
    const { transport } = recordingTransport();
    const { session } = await startedSession(transport);

    session.setAnswer(10);
    await session.next();
    expect(currentId(session)).toBe("promoter");

    session.back();
    expect(currentId(session)).toBe("nps");
    expect(session.getSnapshot().answers.get("nps")).toBe(10);
    expect(session.getSnapshot().canGoBack).toBe(false);
  });

  it("blocks a required question without an answer and doesn't call the server", async () => {
    const { calls, transport } = recordingTransport();
    const { session } = await startedSession(transport);

    await session.next();

    expect(session.getSnapshot().error).toBe(REQUIRED_ANSWER_MESSAGE);
    expect(currentId(session)).toBe("nps");
    expect(calls).toEqual(["start"]);
  });

  it("sends null for a saved optional answer the respondent goes back and empties", async () => {
    const { calls, transport } = recordingTransport();
    const session = new SurveySession({
      survey: {
        ...npsSurvey(),
        questions: [question("first", 0), question("second", 1)],
      },
      transport,
    });
    await session.start();
    session.setAnswer("maybe");
    await session.next();
    session.back();
    session.setAnswer("");
    await session.next();

    expect(currentId(session)).toBe("second");
    expect(calls).toEqual([
      "start",
      'answer first="maybe"',
      "answer first=null",
    ]);
  });

  it("keeps the respondent on the question with an error when saving fails", async () => {
    const { transport } = recordingTransport();
    transport.answer = vi.fn(() => Promise.reject(new Error("offline")));
    const { session } = await startedSession(transport);

    session.setAnswer(9);
    await session.next();

    expect(session.getSnapshot()).toMatchObject({
      error: SAVE_FAILED_MESSAGE,
      isSubmitting: false,
      phase: "question",
    });
    expect(currentId(session)).toBe("nps");
  });

  it("rejects an invalid answer locally with the shared validation message", async () => {
    const { calls, transport } = recordingTransport();
    const { session } = await startedSession(transport);
    session.setAnswer(42);
    await session.next();
    expect(session.getSnapshot().error).toMatch("0 to 10");
    expect(calls).toEqual(["start"]);
  });

  it("reports a dismissal for an unfinished response only, never after the ending", async () => {
    const { calls, transport } = recordingTransport();
    const onDismiss = vi.fn();
    const session = new SurveySession({
      callbacks: { onDismiss },
      survey: npsSurvey(),
      transport,
    });
    await session.start();
    session.dismiss();
    expect(calls).toEqual(["start", "dismiss"]);
    expect(onDismiss).toHaveBeenCalledOnce();
    expect(session.getSnapshot().phase).toBe("dismissed");

    const finished = recordingTransport();
    const onFinishedDismiss = vi.fn();
    const done = new SurveySession({
      callbacks: { onDismiss: onFinishedDismiss },
      survey: npsSurvey(),
      transport: finished.transport,
    });
    await done.start();
    done.setAnswer(10);
    await done.next();
    await done.next();
    done.dismiss();
    expect(finished.calls).not.toContain("dismiss");
    expect(onFinishedDismiss).not.toHaveBeenCalled();
  });

  it("closes the response opened by a start that lands after the user dismissed", async () => {
    const { calls, transport } = recordingTransport();
    const onStart = vi.fn();
    const session = new SurveySession({
      callbacks: { onStart },
      survey: npsSurvey(),
      transport,
    });
    const starting = session.start();
    session.dismiss();
    await starting;
    expect(calls).toEqual(["start", "dismiss"]);
    expect(onStart).not.toHaveBeenCalled();
    expect(session.getSnapshot().phase).toBe("dismissed");
  });

  it("stays dismissed when the completion lands after the user dismissed", async () => {
    const { transport } = recordingTransport();
    let landCompletion: () => void = () => undefined;
    transport.complete = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          landCompletion = resolve;
        })
    );
    const onComplete = vi.fn();
    const session = new SurveySession({
      callbacks: { onComplete },
      survey: npsSurvey(),
      transport,
    });
    await session.start();
    session.setAnswer(10);
    await session.next();
    const finishing = session.next();
    await vi.waitFor(() => expect(transport.complete).toHaveBeenCalled());
    session.dismiss();
    landCompletion();
    await finishing;
    expect(onComplete).not.toHaveBeenCalled();
    expect(session.getSnapshot().phase).toBe("dismissed");
  });
});
