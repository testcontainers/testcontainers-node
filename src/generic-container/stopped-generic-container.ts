// import { StoppedTestContainer } from "../test-container";
// import { getContainerArchive } from "../docker/functions/container/get-container-archive";
// import Dockerode from "dockerode";
// import { log } from "@testcontainers/logger";
//
// export class StoppedGenericContainer implements StoppedTestContainer {
//   constructor(private readonly container: Dockerode.Container) {}
//
//   getId(): string {
//     return this.container.id;
//   }
//
//   copyArchiveFromContainer(path: string): Promise<NodeJS.ReadableStream> {
//     log.debug(`Copying archive "${path}" from container...`, { containerId: this.container.id });
//     const stream = getContainerArchive({ container: this.container, path: path });
//     log.debug(`Copied archive "${path}" from container`, { containerId: this.container.id });
//     return stream;
//   }
// }
