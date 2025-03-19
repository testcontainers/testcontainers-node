import { LIB_VERSION } from "../version";

export const LABEL_TESTCONTAINERS = "org.testcontainers";
export const LABEL_TESTCONTAINERS_LANG = "org.testcontainers.lang";
export const LABEL_TESTCONTAINERS_VERSION = "org.testcontainers.version";
export const LABEL_TESTCONTAINERS_SESSION_ID = "org.testcontainers.session-id";
export const LABEL_TESTCONTAINERS_SSHD = "org.testcontainers.sshd";
export const LABEL_TESTCONTAINERS_CONTAINER_HASH = "org.testcontainers.container-hash";
export const LABEL_TESTCONTAINERS_RYUK = "org.testcontainers.ryuk";

export function createLabels(): Record<string, string> {
  return {
    [LABEL_TESTCONTAINERS]: "true",
    [LABEL_TESTCONTAINERS_LANG]: "node",
    [LABEL_TESTCONTAINERS_VERSION]: LIB_VERSION,
  };
}
