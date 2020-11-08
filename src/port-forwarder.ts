import { Client } from "ssh2";
import { DockerClient } from "./docker-client";
import { log } from "./logger";
import { GenericContainer } from "./generic-container";
import { RandomUuid } from "./uuid";
import { Port } from "./port";
import { StartedTestContainer } from "./test-container";

export class PortForwarder {
  constructor(private readonly client: Client, private readonly container: StartedTestContainer) {}

  public async exposeHostPort(port: Port): Promise<void> {
    log.debug(`Exposing host port ${port}`);

    await new Promise((resolve, reject) => {
      this.client.forwardIn("localhost", port, (err) => {
        if (err) {
          return reject(err);
        }
        resolve();
      });
    });
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

    const password = new RandomUuid().nextUuid();

    const container = await new GenericContainer(this.IMAGE_NAME, this.IMAGE_VERSION)
      .withName(`testcontainers-port-forwarder-${dockerClient.getSessionId()}`)
      .withExposedPorts(22)
      .withEnv("PASSWORD", password)
      .withCmd([
        "sh",
        "-c",
        `echo "root:$PASSWORD" | chpasswd && /usr/sbin/sshd -D -o PermitRootLogin=yes -o AddressFamily=inet -o GatewayPorts=yes`,
      ])
      .start();

    const host = dockerClient.getHost();
    const port = container.getMappedPort(22);

    log.debug(`Connecting to Port Forwarder on ${host}:${port}`);

    const client: Client = await new Promise((resolve) => {
      const client = new Client();
      client.on("ready", () => resolve(client));
      client.connect({ host, port, username: "root", password });
    });

    return new PortForwarder(client, container);
  }
}
