import { Client } from "ssh2";
import { DockerClient } from "./docker-client";
import { log } from "./logger";
import { GenericContainer } from "./generic-container";
import { Port } from "./port";
import { StartedTestContainer } from "./test-container";
import * as net from "net";

export class PortForwarder {
  constructor(private client: Client, private readonly container: StartedTestContainer) {}

  public async exposeHostPort(port: Port): Promise<void> {
    log.debug(`Exposing host port ${port}`);

    return new Promise((resolve) => {
      const conn = new Client();

      this.client = conn;
      conn
        .on("connect", () => {
          // @ts-ignore
          conn._sock.unref();
        })
        .on("ready", function () {
          console.log("Client :: ready");
          conn.forwardIn("127.0.0.1", port, function (err) {
            if (err) throw err;
            console.log(`Listening for connections on server on port ${port}!`);
            resolve();
          });
        })
        .on("tcp connection", function (info, accept, reject) {
          console.log("TCP :: INCOMING CONNECTION:");
          console.dir(info);

          const stream = accept();

          stream.on("data", function (data: any) {
            console.log("TCP :: DATA: " + data);
          });

          stream.on("end", function () {
            console.log("TCP :: EOF");
          });

          stream.on("error", function (err: any) {
            console.log("TCP :: ERROR: " + err);
          });

          stream.on("close", function (had_err: any) {
            console.log("TCP :: CLOSED", had_err ? "had error" : "");
          });

          stream.pause();

          const socket = net.connect(info.destPort, info.destIP, () => {
            stream.pipe(socket);
            socket.pipe(stream);
            stream.resume();
          });
        })
        .connect({
          host: this.container.getHost(),
          port: this.container.getMappedPort(22),
          username: "root",
          password: "password",
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

    const password = "password";

    const container = await new GenericContainer(this.IMAGE_NAME, this.IMAGE_VERSION)
      .withName(`testcontainers-port-forwarder-${dockerClient.getSessionId()}`)
      .withDaemonMode()
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

    // @ts-ignore
    return new PortForwarder(null, container);
  }
}
