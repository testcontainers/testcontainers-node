// import Dockerode from "dockerode";
// import { log } from "@testcontainers/logger";
//
// export type GetContainerArchiveOptions = {
//   container: Dockerode.Container;
//   path: string;
// };
//
// export const getContainerArchive = async (options: GetContainerArchiveOptions): Promise<NodeJS.ReadableStream> => {
//   try {
//     return await options.container.getArchive({ path: options.path });
//   } catch (err) {
//     log.error(`Failed to get archive from container: ${err}`, { containerId: options.container.id });
//     throw err;
//   }
// };
