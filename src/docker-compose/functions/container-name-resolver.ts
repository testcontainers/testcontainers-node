import { sessionId } from "../../docker/session-id";

export const resolveContainerName = (containerName: string): string => {
  if (containerName.includes(sessionId)) {
    return containerName.substring(`/${sessionId}_`.length);
  } else if (containerName.startsWith("/")) {
    return containerName.substring(1);
  } else {
    throw new Error(
      `Unable to resolve container name for container name: "${containerName}", session ID: "${sessionId}"`
    );
  }
};
