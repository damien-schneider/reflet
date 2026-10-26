import { useEffect, useState } from "react";
import {
  LIVE_HUB_ENDPOINTS,
  type LiveApp,
  type LiveCapture,
  type LiveCommand,
  type LiveFocus,
  type LiveHubEntry,
  type LiveWindowMessage,
  liveWindowMessageSchema,
} from "../../protocol";
import { HUB_HEADERS } from "./hub-client";

const RECONNECT_DELAY_MS = 2000;

export type StreamLink = "connecting" | "open" | "lost" | "elsewhere";

export interface HubActivity {
  agentFollowing: boolean;
  apps: LiveApp[];
  entries: LiveHubEntry[];
  focus: LiveFocus | null;
  lastCapture: LiveCapture | null;
  transcribing: number;
}

type CommandListener = (action: LiveCommand) => void;

export interface CommandChannel {
  subscribe: (listener: CommandListener) => () => void;
}

export interface HubStream {
  activity: HubActivity;
  commands: CommandChannel;
  epoch: number;
  link: StreamLink;
}

const NO_ACTIVITY: HubActivity = {
  agentFollowing: false,
  apps: [],
  entries: [],
  focus: null,
  lastCapture: null,
  transcribing: 0,
};

function createCommandChannel() {
  const listeners = new Set<CommandListener>();
  return {
    emit: (action: LiveCommand) => {
      for (const listener of listeners) {
        listener(action);
      }
    },
    subscribe: (listener: CommandListener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

async function* readLines(
  body: ReadableStream<Uint8Array>
): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffered = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    buffered += decoder.decode(value, { stream: true });
    const lines = buffered.split("\n");
    buffered = lines.pop() ?? "";
    yield* lines.filter((line) => line.trim() !== "");
  }
  if (buffered.trim() !== "") {
    yield buffered;
  }
}

async function followStream(
  signal: AbortSignal,
  handlers: {
    onMessage: (message: LiveWindowMessage) => void;
    onOpen: () => void;
  }
): Promise<"ended" | "elsewhere"> {
  const response = await fetch(LIVE_HUB_ENDPOINTS.windowStream, {
    headers: HUB_HEADERS,
    signal,
  });
  if (!(response.ok && response.body)) {
    throw new Error(`The Reflet Live hub answered ${response.status}.`);
  }
  let isOpen = false;
  for await (const line of readLines(response.body)) {
    const message = liveWindowMessageSchema.parse(JSON.parse(line));
    if (message.kind === "elsewhere") {
      return "elsewhere";
    }
    if (!isOpen) {
      isOpen = true;
      handlers.onOpen();
    }
    handlers.onMessage(message);
  }
  return "ended";
}

function withMessage(
  activity: HubActivity,
  message: LiveWindowMessage
): HubActivity {
  switch (message.kind) {
    case "apps":
      return { ...activity, apps: message.apps, focus: message.focus };
    case "feed":
      return {
        ...activity,
        entries: message.entries,
        transcribing: message.transcribing,
      };
    case "capture":
      return { ...activity, lastCapture: message.capture };
    case "agent":
      return { ...activity, agentFollowing: message.following };
    default:
      return activity;
  }
}

export function useHubStream(): HubStream {
  const [commands] = useState(createCommandChannel);
  const [link, setLink] = useState<StreamLink>("connecting");
  const [epoch, setEpoch] = useState(0);
  const [activity, setActivity] = useState(NO_ACTIVITY);

  useEffect(() => {
    const controller = new AbortController();
    const reconnectLater = () => {
      if (controller.signal.aborted) {
        return;
      }
      setLink("lost");
      setTimeout(connect, RECONNECT_DELAY_MS);
    };
    const connect = () => {
      if (controller.signal.aborted) {
        return;
      }
      followStream(controller.signal, {
        onMessage: (message) => {
          if (message.kind === "command") {
            commands.emit(message.action);
          } else {
            setActivity((current) => withMessage(current, message));
          }
        },
        onOpen: () => {
          setLink("open");
          setEpoch((current) => current + 1);
        },
      }).then((end) => {
        if (end === "elsewhere") {
          setLink("elsewhere");
        } else {
          reconnectLater();
        }
      }, reconnectLater);
    };
    connect();
    return () => controller.abort();
  }, [commands]);

  return { activity, commands, epoch, link };
}
