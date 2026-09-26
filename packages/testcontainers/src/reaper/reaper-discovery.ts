import { ContainerInfo } from "dockerode";

import { LABEL_TESTCONTAINERS_LANG, LABEL_TESTCONTAINERS_RYUK, LABEL_TESTCONTAINERS_SESSION_ID } from "../utils/labels";

const LABEL_TESTCONTAINERS_RYUK_TEST_LABEL = "TESTCONTAINERS_RYUK_TEST_LABEL";

/**
 * Decides whether a running Ryuk container can be adopted by this binding's
 * session. A reaper is only adoptable when this binding can actually own the
 * session it watches:
 *
 * - it must have been started by this library, which labels everything it
 *   creates with `org.testcontainers.lang: "node"` (see `createLabels()`), and
 * - it must carry its session id in a durable label. Ryuk containers started
 *   by other language bindings carry neither, and adopting them used to mint
 *   a fresh session id per worker that no reaper ever owned — leaking every
 *   container created under it (see issue #1442).
 */
export function isAdoptableReaperContainer(container: ContainerInfo): boolean {
  return (
    container.State === "running" &&
    container.Labels[LABEL_TESTCONTAINERS_RYUK] === "true" &&
    container.Labels[LABEL_TESTCONTAINERS_RYUK_TEST_LABEL] !== "true" &&
    container.Labels[LABEL_TESTCONTAINERS_LANG] === "node" &&
    typeof container.Labels[LABEL_TESTCONTAINERS_SESSION_ID] === "string"
  );
}
