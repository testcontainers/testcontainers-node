import Dockerode from "dockerode";
import { log } from "@testcontainers/common";

export const startContainer = async (container: Dockerode.Container): Promise<void> => {
  try {
    await container.start();
  } catch (err) {
    log.error(`Failed to start container: ${err}`, { containerId: container.id });
    throw err;
  }
};
