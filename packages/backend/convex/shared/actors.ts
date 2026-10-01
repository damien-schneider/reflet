export const API_ACTOR_ID = "api";
export const SYSTEM_ACTOR_ID = "system";
const AGENT_ACTOR_PREFIX = "agent:";

export const agentActorId = (agentName: string): string =>
  `${AGENT_ACTOR_PREFIX}${agentName}`;

export const nonUserActorName = (actorId: string): string | undefined => {
  if (actorId.startsWith(AGENT_ACTOR_PREFIX)) {
    return actorId.slice(AGENT_ACTOR_PREFIX.length);
  }
  switch (actorId) {
    case API_ACTOR_ID:
      return "API";
    case SYSTEM_ACTOR_ID:
      return "System";
    default:
      return undefined;
  }
};
