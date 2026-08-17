import type Dockerode from "dockerode";
import type { ContainerInfo } from "dockerode";
import { createSshConnection, type SshConnection } from "ssh-remote-port-forward";
import { log, withFileLock } from "../common";
import { type ContainerRuntimeClient, getContainerRuntimeClient, ImageName } from "../container-runtime";
import { GenericContainer } from "../generic-container/generic-container";
import { getReaper } from "../reaper/reaper";
import { LABEL_TESTCONTAINERS_SESSION_ID, LABEL_TESTCONTAINERS_SSHD } from "../utils/labels";
import type { PortWithOptionalBinding } from "../utils/port";

export const SSHD_IMAGE = process.env.SSHD_CONTAINER_IMAGE
  ? ImageName.fromString(process.env.SSHD_CONTAINER_IMAGE).string
  : ImageName.fromString("testcontainers/sshd:1.4.0").string;

class PortForwarder {
  constructor(
    private readonly sshConnection: SshConnection,
    private readonly containerId: string,
    private readonly networkId: string,
    private readonly ipAddress: string,
    // biome-ignore lint/correctness/noUnusedPrivateClassMembers: kept private; unused but part of the internal constructor contract
    private readonly networkName: string
  ) {}

  public async exposeHostPort(port: number): Promise<void> {
    log.info(`Exposing host port ${port}...`);
    await this.sshConnection.remoteForward("localhost", port);
    log.info(`Exposed host port ${port}`);
  }

  public getContainerId(): string {
    return this.containerId;
  }

  public getNetworkId(): string {
    return this.networkId;
  }

  public getIpAddress(): string {
    return this.ipAddress;
  }
}

// biome-ignore lint/complexity/noStaticOnlyClass: singleton holder with private static state
export class PortForwarderInstance {
  private static readonly USERNAME = "root";
  private static readonly PASSWORD = "root";

  private static instance: Promise<PortForwarder>;

  public static isRunning(): boolean {
    return PortForwarderInstance.instance !== undefined;
  }

  public static async getInstance(): Promise<PortForwarder> {
    if (!PortForwarderInstance.instance) {
      await withFileLock("testcontainers-node-sshd.lock", async () => {
        const client = await getContainerRuntimeClient();
        const reaper = await getReaper(client);
        const sessionId = reaper.sessionId;
        const portForwarderContainer = await PortForwarderInstance.findPortForwarderContainer(client, sessionId);

        if (portForwarderContainer) {
          PortForwarderInstance.instance = PortForwarderInstance.reuseInstance(
            client,
            portForwarderContainer,
            sessionId
          );
        } else {
          PortForwarderInstance.instance = PortForwarderInstance.createInstance();
        }
        await PortForwarderInstance.instance;
      });
    }
    return PortForwarderInstance.instance;
  }

  private static async findPortForwarderContainer(
    client: ContainerRuntimeClient,
    sessionId: string
  ): Promise<ContainerInfo | undefined> {
    const containers = await client.container.list();

    return containers.find(
      (container) =>
        container.State === "running" &&
        container.Labels[LABEL_TESTCONTAINERS_SSHD] === "true" &&
        container.Labels[LABEL_TESTCONTAINERS_SESSION_ID] === sessionId
    );
  }

  private static async reuseInstance(
    client: ContainerRuntimeClient,
    container: Dockerode.ContainerInfo,
    sessionId: string
  ): Promise<PortForwarder> {
    log.debug(`Reusing existing PortForwarder for session "${sessionId}"...`);

    const host = client.info.containerRuntime.host;
    const port = container.Ports.find((port) => port.PrivatePort === 22)?.PublicPort;
    if (!port) {
      throw new Error("Expected PortForwarder to map exposed port 22");
    }

    log.debug(`Connecting to Port Forwarder on "${host}:${port}"...`);
    const connection = await createSshConnection({
      host,
      port,
      username: "root",
      password: "root",
      readyTimeout: 100_000,
    });
    log.debug(`Connected to Port Forwarder on "${host}:${port}"`);
    connection.unref();

    const containerId = container.Id;
    const networks = Object.entries(container.NetworkSettings.Networks);
    const networkName = networks[0][0];
    const networkId = container.NetworkSettings.Networks[networkName].NetworkID;
    const ipAddress = container.NetworkSettings.Networks[networkName].IPAddress;

    return new PortForwarder(connection, containerId, networkId, ipAddress, networkName);
  }

  private static async createInstance(): Promise<PortForwarder> {
    log.debug(`Creating new Port Forwarder...`);

    const client = await getContainerRuntimeClient();
    const reaper = await getReaper(client);

    const containerPort: PortWithOptionalBinding = process.env.TESTCONTAINERS_SSHD_PORT
      ? { container: 22, host: Number(process.env.TESTCONTAINERS_SSHD_PORT) }
      : 22;

    const container = await new GenericContainer(SSHD_IMAGE)
      .withName(`testcontainers-port-forwarder-${reaper.sessionId}`)
      .withExposedPorts(containerPort)
      .withEnvironment({ PASSWORD: PortForwarderInstance.PASSWORD })
      .withLabels({ [LABEL_TESTCONTAINERS_SSHD]: "true" })
      .start();

    const host = client.info.containerRuntime.host;
    const port = container.getMappedPort(22);

    log.debug(`Connecting to Port Forwarder on "${host}:${port}"...`);
    const connection = await createSshConnection({
      host,
      port,
      username: PortForwarderInstance.USERNAME,
      password: PortForwarderInstance.PASSWORD,
    });
    log.debug(`Connected to Port Forwarder on "${host}:${port}"`);
    connection.unref();

    const containerId = container.getId();
    const networkName = container.getNetworkNames()[0];
    const networkId = container.getNetworkId(networkName);
    const ipAddress = container.getIpAddress(networkName);

    return new PortForwarder(connection, containerId, networkId, ipAddress, networkName);
  }
}
