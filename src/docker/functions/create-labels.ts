import { DockerImageName } from "../../docker-image-name.js";
import { sessionId } from "../session-id.js";
import { LABEL_SESSION_ID } from "../../labels.js";
import { Labels } from "../types.js";

export const createLabels = (
  reusable: boolean,
  dockerImageName?: DockerImageName,
  extraLabels: Labels = {}
): Labels => {
  const labels: Labels = { ...extraLabels };

  if (dockerImageName && dockerImageName.isReaper()) {
    return labels;
  }

  if (!reusable) {
    labels[LABEL_SESSION_ID] = sessionId;
  }

  return labels;
};
