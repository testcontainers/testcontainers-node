import { log } from "../../../logger";
import { dockerClient } from "../../docker-client";

export type ConnectNetworkOptions = {
  containerId: string;
  networkId: string;
  networkAliases: string[];
};

export const connectNetwork = async (options: ConnectNetworkOptions): Promise<void> => {
  try {
    log.info(`Connecting container ${options.containerId} to network ${options.networkId}`);
    const { dockerode } = await dockerClient();
    const network = dockerode.getNetwork(options.networkId);
    await network.connect({ Container: options.containerId, EndpointConfig: { Aliases: options.networkAliases } });
  } catch (err) {
    log.error(`Failed to connect container ${options.containerId} to network ${options.networkId}: ${err}`);
    throw err;
  }
};
