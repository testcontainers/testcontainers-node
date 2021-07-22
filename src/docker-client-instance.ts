import Dockerode from "dockerode";
import { DockerClient, DockerodeClient } from "./docker-client";
import { log } from "./logger";
import { RandomUuid } from "./uuid";
import { DockerodeUtils } from "./docker-utils";

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
    const dockerUtils = new DockerodeUtils(dockerode);
    const dockerClient = new DockerodeClient(await dockerUtils.getHost(), dockerode, new RandomUuid().nextUuid());
    await dockerUtils.logSystemDiagnostics();

    return dockerClient;
  }
}
