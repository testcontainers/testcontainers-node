import defaultGateway from "default-gateway";
import Dockerode from "dockerode";
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
    const dockerode = new Dockerode();
    const modem = dockerode.modem;

    if (modem.host) {
      this.host = modem.host;
      log.info(`Using Docker host from modem: ${this.host}`);
    } else {
      const socketPath = modem.socketPath;
      if (socketPath === "//./pipe/docker_engine") {
        const { gateway } = defaultGateway.v4.sync();
        this.host = gateway;
        log.info(`Using Docker host from wormhole: ${this.host}, socket path is: ${socketPath}`);
      } else {
        this.host = "localhost";
        log.info(`Using default Docker host: ${this.host}, socket path is: ${socketPath}`);
      }
    }

    this.client = new DockerodeClient(this.host, dockerode);
  }

  public getClient(): DockerClient {
    return this.client;
  }

  public getHost(): Host {
    return this.host;
  }
}
