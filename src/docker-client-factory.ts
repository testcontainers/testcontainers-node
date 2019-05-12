import Dockerode from "dockerode";
import url from "url";
import { DockerClient, DockerodeClient } from "./docker-client";
import log from "./logger";

export type Host = string;

export interface DockerClientFactory {
  getClient(): DockerClient;
  getHost(): Host;
}

export class DockerodeClientFactory implements DockerClientFactory {
  private readonly host: Host;
  private readonly client: DockerClient;

  constructor() {
    if (process.env.DOCKER_HOST) {
      const { host, client } = this.fromDockerHost(process.env.DOCKER_HOST);
      this.host = host;
      this.client = client;
    } else {
      const { host, client } = this.fromDefaults();
      this.host = host;
      this.client = client;
    }
  }

  public getClient(): DockerClient {
    return this.client;
  }

  public getHost(): Host {
    return this.host;
  }

  private fromDefaults() {
    log.info("Using default Docker configuration");

    const host = "localhost";
    const dockerode = new Dockerode();
    const client = new DockerodeClient(host, dockerode);

    return { host, client };
  }

  private fromDockerHost(dockerHost: string) {
    log.info(`Using Docker configuration from DOCKER_HOST: ${process.env.DOCKER_HOST}`);

    const { hostname: host, port } = url.parse(dockerHost);
    if (!host || !port) {
      throw new Error(`Invalid format for DOCKER_HOST, found: ${process.env.DOCKER_HOST}`);
    }

    const dockerode = new Dockerode({ host, port });
    const client = new DockerodeClient(host, dockerode);

    return { host, client };
  }
}
