import { log } from "../../../logger";
import { dockerode } from "../../dockerode";

export const connectNetwork = async (
  containerId: string,
  networkId: string,
  networkAliases: string[]
): Promise<void> => {
  log.info(`Connecting container ${containerId} to network ${networkId}`);
  const network = dockerode.getNetwork(networkId);
  await network.connect({ Container: containerId, EndpointConfig: { Aliases: networkAliases } });
};
