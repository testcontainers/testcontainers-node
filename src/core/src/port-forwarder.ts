import { createSshConnection, SshConnection } from "ssh-remote-port-forward";
import { GenericContainer } from "./generic-container/generic-container";
import { PortWithOptionalBinding } from "./port";
import { StartedTestContainer } from "./test-container";
import { log, RandomUuid } from "@testcontainers/common";
import { getContainerRuntimeClient } from "@testcontainers/container-runtime";
import { getReaper } from "./reaper";

export const SSHD_IMAGE = process.env["SSHD_CONTAINER_IMAGE"] ?? "testcontainers/sshd:1.1.0";

export class PortForwarder {
  constructor(private readonly sshConnection: SshConnection, private readonly container: StartedTestContainer) {}

  public async exposeHostPort(port: number): Promise<void> {
    log.info(`Exposing host port ${port}...`);
    await this.sshConnection.remoteForward("localhost", port);
    log.info(`Exposed host port ${port}`);
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
    log.debug(`Creating new Port Forwarder...`);

    const client = await getContainerRuntimeClient();
    const reaper = await getReaper(client);

    const username = "root";
    const password = new RandomUuid().nextUuid();

    const containerPort: PortWithOptionalBinding = process.env["TESTCONTAINERS_SSHD_PORT"]
      ? { container: 22, host: Number(process.env["TESTCONTAINERS_SSHD_PORT"]) }
      : 22;

    const container = await new GenericContainer(SSHD_IMAGE)
      .withName(`testcontainers-port-forwarder-${reaper.sessionId}`)
      .withExposedPorts(containerPort)
      .withEnvironment({ PASSWORD: password })
      .withCommand([
        "sh",
        "-c",
        `echo "${username}:$PASSWORD" | chpasswd && /usr/sbin/sshd -D -o PermitRootLogin=yes -o AddressFamily=inet -o GatewayPorts=yes -o AllowAgentForwarding=yes -o AllowTcpForwarding=yes -o KexAlgorithms=+diffie-hellman-group1-sha1 -o HostkeyAlgorithms=+ssh-rsa`,
      ])
      .start();

    const host = client.info.containerRuntime.host;
    const port = container.getMappedPort(22);

    log.debug(`Connecting to Port Forwarder on "${host}:${port}"...`);
    const connection = await createSshConnection({ host, port, username, password });
    log.debug(`Connected to Port Forwarder on "${host}:${port}"`);
    connection.unref();

    return new PortForwarder(connection, container);
  }
}
