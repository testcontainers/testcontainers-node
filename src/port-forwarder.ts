import { Client } from "ssh2";
import { DockerClient } from "./docker-client";
import { log } from "./logger";
import { GenericContainer } from "./generic-container";
import { Port } from "./port";
import { StartedTestContainer } from "./test-container";
import net from "net";
import { Host } from "./docker-client-instance";
import { RandomUuid } from "./uuid";

export class PortForwarder {
  constructor(private readonly sshConnection: Client, private readonly container: StartedTestContainer) {}

  public async exposeHostPort(port: Port): Promise<void> {
    log.debug(`Exposing host port ${port}`);
    await new Promise((resolve, reject) => {
      this.sshConnection.forwardIn("127.0.0.1", port, (err) => {
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
    const connection = await this.createSshConnection(host, port, username, password);

    return new PortForwarder(connection, container);
  }

  private static async createSshConnection(
    containerHost: Host,
    containerPort: Port,
    username: string,
    password: string
  ): Promise<Client> {
    return await new Promise((resolve) => {
      const connection = new Client();
      connection
        .on("ready", () => {
          // @ts-ignore
          connection._sock.unref();
          resolve(connection);
        })
        .on("tcp connection", (info, accept) => {
          const stream = accept();
          stream
            .on("data", (data: unknown) => {
              console.log("TCP :: DATA: " + data);
            })
            .on("end", () => {
              console.log("TCP :: EOF");
            })
            .on("error", (err: unknown) => {
              console.log("TCP :: ERROR: " + err);
            })
            .on("close", (hadErr: unknown) => {
              console.log("TCP :: CLOSED", hadErr ? "had error" : "");
            });

          stream.pause();

          const socket = net.connect(info.destPort, info.destIP, () => {
            stream.pipe(socket);
            socket.pipe(stream);
            stream.resume();
          });
        })
        .connect({ host: containerHost, port: containerPort, username, password });
    });
  }
}
