import { Socket } from "net";
import { log } from "./logger";
import { GenericContainer } from "./generic-container/generic-container";
import { REAPER_IMAGE } from "./images";
import { getContainerPort, PortWithOptionalBinding } from "./port";
import { LABEL_TESTCONTAINERS_SESSION_ID } from "./labels";
import { Wait } from "./wait-strategy/wait";
import { IntervalRetryStrategy } from "./retry-strategy";
import { getRemoteDockerUnixSocketPath } from "./docker/remote-docker-unix-socket-path";
import { UnitialisedDockerClient } from "./docker/client/docker-client-types";
import Dockerode from "dockerode";

export interface Reaper {
  addProject(projectName: string): void;

  stop(): void;
}

class RealReaper implements Reaper {
  constructor(private readonly sessionId: string, private readonly socket: Socket) {}

  public addProject(projectName: string): void {
    this.socket.write(`label=com.docker.compose.project=${projectName}\r\n`);
  }

  public stop(): void {
    this.socket.end();
  }
}

class DisabledReaper implements Reaper {
  public addProject(): void {
    // noop
  }

  public stop(): void {
    // noop
  }
}

export class ReaperInstance {
  private static instance: Promise<Reaper>;

  public static async createInstance(
    dockerClient: UnitialisedDockerClient,
    sessionId: string,
    reaperContainer?: Dockerode.ContainerInfo
  ): Promise<void> {
    if (this.isEnabled()) {
      this.instance = this.createRealInstance(dockerClient, sessionId, reaperContainer);
      await this.instance;
    } else {
      this.instance = this.createDisabledInstance();
    }
  }

  public static async getInstance(): Promise<Reaper> {
    return this.instance;
  }

  // public static async stopInstance(): Promise<void> {
  //   if (this.instance) {
  //     const reaper = await this.instance;
  //     reaper.stop();
  //     this.instance = undefined;
  //   }
  // }

  private static isEnabled(): boolean {
    return process.env.TESTCONTAINERS_RYUK_DISABLED !== "true";
  }

  private static isPrivileged(): boolean {
    return process.env.TESTCONTAINERS_RYUK_PRIVILEGED === "true";
  }

  private static async createDisabledInstance(): Promise<Reaper> {
    log.debug(`Not creating new Reaper`);
    return Promise.resolve(new DisabledReaper());
  }

  private static async createRealInstance(
    dockerClient: UnitialisedDockerClient,
    sessionId: string,
    reaperContainer?: Dockerode.ContainerInfo
  ): Promise<Reaper> {
    const containerPort: PortWithOptionalBinding = process.env["TESTCONTAINERS_RYUK_PORT"]
      ? { container: 8080, host: Number(process.env["TESTCONTAINERS_RYUK_PORT"]) }
      : 8080;

    if (reaperContainer) {
      log.debug(`Reusing existing Reaper for session "${sessionId}"...`);
      const port = reaperContainer.Ports.find((port) => port.PrivatePort == 8080)?.PublicPort;
      if (!port) {
        throw new Error();
      }
      const socket = await this.connectToReaper(dockerClient.host, port, sessionId, reaperContainer.Id);
      return new RealReaper(sessionId, socket);
    }

    const remoteDockerUnixSocketPath = getRemoteDockerUnixSocketPath(dockerClient);
    log.debug(`Creating new Reaper for session "${sessionId}" with socket path "${remoteDockerUnixSocketPath}"...`);
    const container = new GenericContainer(REAPER_IMAGE)
      .withName(`testcontainers-ryuk-${sessionId}`)
      .withExposedPorts(containerPort)
      .withLabels({ [LABEL_TESTCONTAINERS_SESSION_ID]: sessionId })
      .withBindMounts([
        {
          source: remoteDockerUnixSocketPath,
          target: "/var/run/docker.sock",
        },
      ])
      .withWaitStrategy(Wait.forLogMessage(/.+ Started!/));

    if (this.isPrivileged()) {
      container.withPrivilegedMode();
    }

    const startedContainer = await container.start();
    const containerId = startedContainer.getId();

    const host = startedContainer.getHost();
    const port = startedContainer.getMappedPort(8080);

    const socket = await this.connectToReaper(host, port, sessionId, containerId);
    return new RealReaper(sessionId, socket);
  }

  private static async connectToReaper(
    host: string,
    port: PortWithOptionalBinding,
    sessionId: string,
    containerId: string
  ): Promise<Socket> {
    const retryStrategy = new IntervalRetryStrategy<Socket | undefined, Error>(1000);
    const retryResult = await retryStrategy.retryUntil(
      (attempt) => {
        return new Promise((resolve) => {
          log.debug(`Connecting to Reaper (attempt ${attempt + 1}) on "${host}:${port}"...`, { containerId });
          const socket = new Socket();
          socket
            .unref()
            .on("timeout", () => log.error(`Reaper ${containerId} socket timed out`))
            .on("error", (err) => log.error(`Reaper ${containerId} socket error: ${err}`))
            .on("close", (hadError) => {
              if (hadError) {
                log.error(`Connection to Reaper closed with error`, { containerId });
              } else {
                log.warn(`Connection to Reaper closed`, { containerId });
              }
              resolve(undefined);
            })
            .connect(getContainerPort(port), host, () => {
              log.debug(`Connected to Reaper`, { containerId });
              socket.write(`label=${LABEL_TESTCONTAINERS_SESSION_ID}=${sessionId}\r\n`);
              resolve(socket);
            });
        });
      },
      (result) => result !== undefined,
      () => {
        const message = `Failed to connect to Reaper`;
        log.error(message, { containerId });
        return new Error(message);
      },
      4000
    );

    if (retryResult instanceof Socket) {
      return retryResult;
    } else {
      throw retryResult;
    }
  }
}
