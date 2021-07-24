import { DockerImageName } from "../../docker-image-name";
import { sessionId } from "../session-id";

export const createLabels = (dockerImageName?: DockerImageName): { [label: string]: string } => {
  if (dockerImageName && dockerImageName.isReaper()) {
    return {};
  }
  return { "org.testcontainers.session-id": sessionId };
};
