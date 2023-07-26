import { version } from "../package.json";

export const LABEL_TESTCONTAINERS = "org.testcontainers";
export const LABEL_TESTCONTAINERS_LANG = "org.testcontainers.lang";
export const LABEL_TESTCONTAINERS_VERSION = "org.testcontainers.version";
export const LABEL_TESTCONTAINERS_SESSION_ID = "org.testcontainers.session-id";
export const LABEL_TESTCONTAINERS_CONTAINER_HASH = "org.testcontainers.container-hash";

export function createLabels(sessionId?: string): Record<string, string> {
  const labels: Record<string, string> = {
    [LABEL_TESTCONTAINERS]: "true",
    [LABEL_TESTCONTAINERS_LANG]: "node",
    [LABEL_TESTCONTAINERS_VERSION]: version,
  };
  if (sessionId) {
    labels[LABEL_TESTCONTAINERS_SESSION_ID] = sessionId;
  }
  return labels;
}
