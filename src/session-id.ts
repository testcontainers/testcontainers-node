import Dockerode from "dockerode";
import { Uuid } from "./uuid";

export type SessionId = {
  sessionId: string;
  container?: Dockerode.ContainerInfo;
};

export async function getSessionId(dockerode: Dockerode, uuidGen: Uuid): Promise<SessionId> {
  const reaperContainer = await findReaperContainer(dockerode);

  if (!reaperContainer) {
    return { sessionId: uuidGen.nextUuid() };
  }

  const sessionId = reaperContainer.Labels["org.testcontainers.session-id"];
  return { sessionId, container: reaperContainer };
}

async function findReaperContainer(dockerode: Dockerode): Promise<Dockerode.ContainerInfo | undefined> {
  const containers = await dockerode.listContainers();
  return containers.find((container) => container.Labels["org.testcontainers.ryuk"] === "true");
}
