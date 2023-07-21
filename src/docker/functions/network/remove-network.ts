// import { log } from "@testcontainers/logger";
// import { getDockerClient } from "../../client/docker-client";
//
// export const removeNetwork = async (id: string): Promise<void> => {
//   try {
//     log.info(`Removing network "${id}"...`);
//
//     const { dockerode } = await getDockerClient();
//     const network = dockerode.getNetwork(id);
//
//     const { message } = await network.remove();
//     if (message) {
//       log.warn(message);
//     }
//     log.info(`Removed network "${id}"`);
//   } catch (err) {
//     log.error(`Failed to remove network "${id}": ${err}`);
//     throw err;
//   }
// };
