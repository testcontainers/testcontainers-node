import { DockerImageName } from "../../docker-image-name";
import { sessionId } from "../session-id";
import { LABEL_SESSION_ID } from "../../labels";

export type Labels = { [key: string]: string };

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
