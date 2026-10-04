"use client";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@ctrl-ui/react/ui/empty";
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import { CheckCircle, LinkBreak } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import {
  getRespondentId,
  type SurveyTransport,
} from "@reflet/survey-core/client";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import Image from "next/image";
import { useTheme } from "next-themes";
import { type ReactNode, useMemo, useState, useSyncExternalStore } from "react";
import { SurveyCard, useSurveySession } from "reflet-sdk/surveys";

type HostedLink = NonNullable<FunctionReturnType<typeof api.surveys.link.get>>;

const subscribeToNothing = () => () => undefined;

function HostedSurveyFrame({
  children,
  organization,
}: {
  children: ReactNode;
  organization?: HostedLink["organization"];
}) {
  const logo = organization?.logo;
  return (
    <main className="flex min-h-dvh flex-col items-center px-4 py-10 sm:py-16">
      <header className="mb-8 flex h-8 items-center">
        {organization && logo ? (
          <Image
            alt={organization.name}
            className="h-8 w-auto max-w-40 rounded-sm object-contain"
            height={32}
            src={logo}
            width={160}
          />
        ) : null}
        {organization && !logo ? (
          <span className="font-medium text-heading-4">
            {organization.name}
          </span>
        ) : null}
      </header>
      <div className="w-full max-w-xl">{children}</div>
    </main>
  );
}

function HostedSurveyMessage({
  description,
  icon,
  title,
}: {
  description: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia>{icon}</EmptyMedia>
        <EmptyTitle aria-level={1} role="heading">
          {title}
        </EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

function HostedSurveySession({
  link,
  respondentId,
}: {
  link: HostedLink;
  respondentId: string;
}) {
  const startResponse = useMutation(api.surveys.link.start);
  const saveAnswer = useMutation(api.surveys.link.answer);
  const completeResponse = useMutation(api.surveys.link.complete);
  const { resolvedTheme } = useTheme();
  const { survey } = link;

  const transport = useMemo<SurveyTransport>(() => {
    let responseId: Id<"surveyResponses"> | null = null;
    const currentResponseId = () => {
      if (!responseId) {
        throw new Error("The survey response hasn’t started yet.");
      }
      return responseId;
    };
    return {
      answer: async ({ questionId, value }) => {
        const question = survey.questions.find(({ _id }) => _id === questionId);
        if (!question) {
          throw new Error("This question isn’t part of the survey.");
        }
        await saveAnswer({
          questionId: question._id,
          responseId: currentResponseId(),
          value,
        });
      },
      complete: () => completeResponse({ responseId: currentResponseId() }),
      dismiss: () => Promise.resolve(),
      start: async () => {
        responseId = await startResponse({
          respondentId,
          surveyId: survey._id,
        });
        return { responseId };
      },
    };
  }, [completeResponse, respondentId, saveAnswer, startResponse, survey]);

  const session = useSurveySession(survey, { transport });

  return (
    <SurveyCard
      primaryColor={link.organization.primaryColor}
      session={session}
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      variant="page"
    />
  );
}

export function HostedSurvey({ surveyId }: { surveyId: string }) {
  const respondentId = useSyncExternalStore(
    subscribeToNothing,
    getRespondentId,
    () => null
  );
  const [startedLink, setStartedLink] = useState<HostedLink | null>(null);
  const link = useQuery(
    api.surveys.link.get,
    respondentId && startedLink === null ? { respondentId, surveyId } : "skip"
  );

  const mayAnswer =
    link &&
    !(link.alreadyCompleted && link.survey.display.frequency !== "recurring");
  if (mayAnswer && startedLink === null) {
    setStartedLink(link);
  }

  if (startedLink && respondentId) {
    return (
      <HostedSurveyFrame organization={startedLink.organization}>
        <HostedSurveySession link={startedLink} respondentId={respondentId} />
      </HostedSurveyFrame>
    );
  }

  if (link === undefined || mayAnswer) {
    return (
      <HostedSurveyFrame>
        <div aria-busy="true" className="flex flex-col gap-4">
          <p className="sr-only" role="status">
            Loading the survey…
          </p>
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-40 w-full rounded-lg" />
        </div>
      </HostedSurveyFrame>
    );
  }

  if (link === null) {
    return (
      <HostedSurveyFrame>
        <HostedSurveyMessage
          description="It may have closed, or its link was turned off. Ask the person who shared it for a new link."
          icon={<LinkBreak aria-hidden className="size-6" />}
          title="This survey isn’t available"
        />
      </HostedSurveyFrame>
    );
  }

  return (
    <HostedSurveyFrame organization={link.organization}>
      <HostedSurveyMessage
        description="Thanks, your answers are already saved. There’s nothing more to do."
        icon={<CheckCircle aria-hidden className="size-6" />}
        title="You already answered this survey"
      />
    </HostedSurveyFrame>
  );
}
