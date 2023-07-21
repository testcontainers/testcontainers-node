// import Dockerode from "dockerode";
// import { log } from "@testcontainers/logger";
//
// export type RemoveContainerOptions = {
//   removeVolumes: boolean;
// };
//
// export const removeContainer = async (
//   container: Dockerode.Container,
//   options: RemoveContainerOptions
// ): Promise<void> => {
//   try {
//     await container.remove({ v: options.removeVolumes });
//   } catch (err) {
//     log.error(`Failed to remove container: ${err}`, { containerId: container.id });
//     throw err;
//   }
// };
