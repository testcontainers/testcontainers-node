// import Dockerode from "dockerode";
// import { getDockerClient } from "../../client/docker-client";
// import { log } from "@testcontainers/logger";
//
// export const listContainers = async (): Promise<Dockerode.ContainerInfo[]> => {
//   try {
//     const { dockerode } = await getDockerClient();
//     return await dockerode.listContainers();
//   } catch (err) {
//     log.error(`Failed to list containers: ${err}`);
//     throw err;
//   }
// };
