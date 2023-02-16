import { DockerImageName } from "../../docker-image-name";
import { sessionId } from "../session-id";
import {
  LABEL_TESTCONTAINERS,
  LABEL_TESTCONTAINERS_LANG,
  LABEL_TESTCONTAINERS_VERSION,
  LABEL_TESTCONTAINERS_SESSION_ID,
} from "../../labels";
import { version } from "../../../package.json";
import { Labels } from "../types";

export const createLabels = (
  reusable: boolean,
  dockerImageName?: DockerImageName,
  extraLabels: Labels = {}
): Labels => {
  const labels: Labels = {
    ...extraLabels,
    [LABEL_TESTCONTAINERS]: "true",
    [LABEL_TESTCONTAINERS_LANG]: "node",
    [LABEL_TESTCONTAINERS_VERSION]: version,
  };

  if (dockerImageName && dockerImageName.isReaper()) {
    return labels;
  }

  if (!reusable) {
    labels[LABEL_TESTCONTAINERS_SESSION_ID] = sessionId;
  }

  return labels;
};
