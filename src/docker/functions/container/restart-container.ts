import { log } from "../../../logger";
import Dockerode from "dockerode";

export type RestartContainerOptions = {
  timeout: number;
};

export const restartContainer = async (
  container: Dockerode.Container,
  options: RestartContainerOptions
): Promise<void> => {
  try {
    await container.restart({ t: options.timeout / 1000 });
  } catch (err: any) {
    log.error(`Failed to restart container ${container.id}: ${err}`);
    throw err;
  }
};
