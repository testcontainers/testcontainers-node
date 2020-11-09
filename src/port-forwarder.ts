import { createSshConnection, SshConnection } from "ssh-remote-port-forward";
import { DockerClient } from "./docker-client";
import { log } from "./logger";
import { GenericContainer } from "./generic-container";
import { Port } from "./port";
import { StartedTestContainer } from "./test-container";
import { RandomUuid } from "./uuid";

export class PortForwarder {
  constructor(private readonly sshConnection: SshConnection, private readonly container: StartedTestContainer) {}

  public async exposeHostPort(port: Port): Promise<void> {
    log.info(`Exposing host port ${port}`);
    await this.sshConnection.remoteForward("localhost", port);
  }

  public getNetworkId(): string {
    return this.container.getNetworkId(this.getNetworkName());
  }

  public getIpAddress(): string {
    return this.container.getIpAddress(this.getNetworkName());
  }

  private getNetworkName(): string {
    return this.container.getNetworkNames()[0];
  }
}

export class PortForwarderInstance {
  public static IMAGE_NAME = "testcontainers/sshd";
  public static IMAGE_VERSION = "1.0.0";

  private static instance: Promise<PortForwarder>;

  public static isRunning(): boolean {
    return this.instance !== undefined;
  }

  public static async getInstance(dockerClient: DockerClient): Promise<PortForwarder> {
    if (!this.instance) {
      this.instance = this.createInstance(dockerClient);
    }
    return this.instance;
  }

  private static async createInstance(dockerClient: DockerClient): Promise<PortForwarder> {
    log.debug(`Creating new Port Forwarder`);

    const username = "root";
    const password = new RandomUuid().nextUuid();

    const container = await new GenericContainer(this.IMAGE_NAME, this.IMAGE_VERSION)
      .withName(`testcontainers-port-forwarder-${dockerClient.getSessionId()}`)
      .withDaemonMode()
      .withExposedPorts(22)
      .withEnv("PASSWORD", password)
      .withCmd([
        "sh",
        "-c",
        `echo "${username}:$PASSWORD" | chpasswd && /usr/sbin/sshd -D -o PermitRootLogin=yes -o AddressFamily=inet -o GatewayPorts=yes`,
      ])
      .start();

    const host = dockerClient.getHost();
    const port = container.getMappedPort(22);

    log.debug(`Connecting to Port Forwarder on ${host}:${port}`);
    const connection = await createSshConnection({ host, port, username, password });
    connection.unref();

    return new PortForwarder(connection, container);
  }
}
