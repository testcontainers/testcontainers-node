import { createSshConnection, SshConnection } from "ssh-remote-port-forward";
import { log } from "./logger";
import { GenericContainer } from "./generic-container/generic-container";
import { PortWithOptionalBinding } from "./port";
import { StartedTestContainer } from "./test-container";
import { RandomUuid } from "./uuid";
import { sessionId } from "./docker/session-id";
import { dockerClient } from "./docker/docker-client";
import { SSHD_IMAGE } from "./images";

export class PortForwarder {
  constructor(private readonly sshConnection: SshConnection, private readonly container: StartedTestContainer) {}

  public async exposeHostPort(port: number): Promise<void> {
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
  private static instance: Promise<PortForwarder>;

  public static isRunning(): boolean {
    return this.instance !== undefined;
  }

  public static async getInstance(): Promise<PortForwarder> {
    if (!this.instance) {
      this.instance = this.createInstance();
    }
    return this.instance;
  }

  private static async createInstance(): Promise<PortForwarder> {
    log.debug(`Creating new Port Forwarder`);

    const username = "root";
    const password = new RandomUuid().nextUuid();

    const containerPort: PortWithOptionalBinding = process.env["TESTCONTAINERS_SSHD_PORT"]
      ? { container: 22, host: Number(process.env["TESTCONTAINERS_SSHD_PORT"]) }
      : 22;

    const container = await new GenericContainer(SSHD_IMAGE)
      .withName(`testcontainers-port-forwarder-${sessionId}`)
      .withExposedPorts(containerPort)
      .withEnvironment("PASSWORD", password)
      .withCommand([
        "sh",
        "-c",
        `echo "${username}:$PASSWORD" | chpasswd && /usr/sbin/sshd -D -o PermitRootLogin=yes -o AddressFamily=inet -o GatewayPorts=yes`,
      ])
      .start();

    const host = (await dockerClient()).host;
    const port = container.getMappedPort(22);

    log.debug(`Connecting to Port Forwarder on ${host}:${port}`);
    const connection = await createSshConnection({ host, port, username, password });
    connection.unref();

    return new PortForwarder(connection, container);
  }
}
