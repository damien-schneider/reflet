import { type Message, Role, type SendMessageRequest } from "@a2a-js/sdk";
import {
  ContentTypeNotSupportedError,
  ExtendedAgentCardNotConfiguredError,
  PushNotificationNotSupportedError,
  RequestMalformedError,
  TaskNotFoundError,
  UnsupportedOperationError,
} from "@a2a-js/sdk/errors";
import type { A2ARequestHandler } from "@a2a-js/sdk/server";
import { documentName, readDocumentation } from "@/lib/agents/documents";
import { DOCUMENTATION_AGENT } from "./card";

function parseDocumentationMessage(params: SendMessageRequest) {
  const message = params.message;
  if (!message?.messageId || message.role !== Role.ROLE_USER) {
    throw new RequestMalformedError(
      "A user message with a messageId is required."
    );
  }
  if (message.taskId) {
    rejectMissingTask();
  }
  if (params.configuration?.taskPushNotificationConfig) {
    rejectPushNotifications();
  }
  const part = message.parts[0];
  const supportsText =
    part?.mediaType === "" || part?.mediaType === "text/plain";
  const hasSingleSupportedPart = message.parts.length === 1 && supportsText;
  if (!hasSingleSupportedPart || part?.content?.$case !== "text") {
    throw new ContentTypeNotSupportedError(
      "Send one text/plain part containing a document name."
    );
  }
  const document = documentName.safeParse(
    part.content.value.trim().toLowerCase()
  );
  if (!document.success) {
    throw new RequestMalformedError(
      `Choose one document: ${documentName.options.join(", ")}.`
    );
  }
  const acceptedOutputModes = params.configuration?.acceptedOutputModes ?? [];
  if (
    acceptedOutputModes.length > 0 &&
    !acceptedOutputModes.includes("text/markdown")
  ) {
    throw new ContentTypeNotSupportedError(
      "Documentation is returned as text/markdown."
    );
  }
  return { contextId: message.contextId, document: document.data };
}

async function sendDocumentation(params: SendMessageRequest): Promise<Message> {
  const { document, contextId } = parseDocumentationMessage(params);
  const content = await readDocumentation(document);
  return {
    contextId: contextId || crypto.randomUUID(),
    extensions: [],
    messageId: crypto.randomUUID(),
    metadata: undefined,
    parts: [
      {
        content: { $case: "text", value: content.text },
        filename: "",
        mediaType: content.mimeType,
        metadata: { source: content.uri },
      },
    ],
    referenceTaskIds: [],
    role: Role.ROLE_AGENT,
    taskId: "",
  };
}

function rejectMissingTask(): never {
  throw new TaskNotFoundError(
    "This documentation agent does not create or retain tasks."
  );
}

function rejectStreaming(): never {
  throw new UnsupportedOperationError(
    "This documentation agent returns direct messages without streaming."
  );
}

function rejectPushNotifications(): never {
  throw new PushNotificationNotSupportedError(
    "This documentation agent does not send push notifications."
  );
}

export const documentationRequestHandler = {
  cancelTask: rejectMissingTask,
  createTaskPushNotificationConfig: rejectPushNotifications,
  deleteTaskPushNotificationConfig: rejectPushNotifications,
  getAgentCard: () => Promise.resolve(DOCUMENTATION_AGENT),
  getAuthenticatedExtendedAgentCard: () => {
    throw new ExtendedAgentCardNotConfiguredError(
      "All documentation is public."
    );
  },
  getTask: rejectMissingTask,
  getTaskPushNotificationConfig: rejectPushNotifications,
  listTaskPushNotificationConfigs: rejectPushNotifications,
  listTasks: () =>
    Promise.resolve({
      nextPageToken: "",
      pageSize: 0,
      tasks: [],
      totalSize: 0,
    }),
  resubscribe: rejectStreaming,
  sendMessage: sendDocumentation,
  sendMessageStream: rejectStreaming,
} satisfies A2ARequestHandler;
