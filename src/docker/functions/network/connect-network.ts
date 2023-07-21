// import { log } from "@testcontainers/logger";
// import { getDockerClient } from "../../client/docker-client";
//
// export type ConnectNetworkOptions = {
//   containerId: string;
//   networkId: string;
//   networkAliases: string[];
// };
//
// export const connectNetwork = async (options: ConnectNetworkOptions): Promise<void> => {
//   try {
//     log.info(`Connecting to network "${options.networkId}"...`, { containerId: options.containerId });
//     const { dockerode } = await getDockerClient();
//     const network = dockerode.getNetwork(options.networkId);
//     await network.connect({ Container: options.containerId, EndpointConfig: { Aliases: options.networkAliases } });
//     log.info(`Connected to network "${options.networkId}"...`, { containerId: options.containerId });
//   } catch (err) {
//     log.error(`Failed to connect to network "${options.networkId}": ${err}`, { containerId: options.containerId });
//     throw err;
//   }
// };
