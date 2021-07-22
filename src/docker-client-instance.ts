import Dockerode from "dockerode";
import { DockerClient, DockerodeClient } from "./docker-client";
import { log } from "./logger";
import { RandomUuid } from "./uuid";
import { getDockerHost } from "./get-docker-host";
import { logSystemDiagnostics } from "./log-system-diagnostics";

export type Host = string;

export class DockerClientInstance {
  private static instance: Promise<DockerClient>;

  public static async getInstance(): Promise<DockerClient> {
    if (!this.instance) {
      this.instance = this.createInstance();
    }
    return this.instance;
  }

  private static async createInstance(): Promise<DockerClient> {
    log.debug("Creating new DockerClient");
    const dockerode = new Dockerode();
    await logSystemDiagnostics(dockerode);
    return new DockerodeClient(await getDockerHost(dockerode), dockerode, new RandomUuid().nextUuid());
  }
}
