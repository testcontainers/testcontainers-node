import { Socket } from "net";
import { log } from "./logger";
import { GenericContainer } from "./generic-container";
import { StartedTestContainer } from "./test-container";
import { Wait } from "./wait";
import { Id } from "./container";
import { DockerClient } from "./docker-client";

export interface Reaper {
  addProject(projectName: string): void;
  stop(): void;
}

class RealReaper implements Reaper {
  constructor(
    private readonly sessionId: Id,
    private readonly container: StartedTestContainer,
    private readonly socket: Socket
  ) {}

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
  private static DEFAULT_IMAGE = "cristianrgreco/ryuk:0.4.0";

  private static instance?: Promise<Reaper>;

  public static async getInstance(dockerClient: DockerClient): Promise<Reaper> {
    if (!this.instance) {
      if (this.isEnabled()) {
        this.instance = this.createRealInstance(dockerClient);
      } else {
        this.instance = this.createDisabledInstance(dockerClient);
      }
    }

    return this.instance;
  }

  public static async stopInstance(): Promise<void> {
    if (this.instance) {
      const reaper = await this.instance;
      reaper.stop();
      this.instance = undefined;
    }
  }

  public static getImage(): string {
    return process.env.RYUK_CONTAINER_IMAGE === undefined ? this.DEFAULT_IMAGE : process.env.RYUK_CONTAINER_IMAGE;
  }

  private static isEnabled(): boolean {
    return process.env.TESTCONTAINERS_RYUK_DISABLED !== "true";
  }

  private static createDisabledInstance(dockerClient: DockerClient): Promise<Reaper> {
    const sessionId = dockerClient.getSessionId();

    log.debug(`Not creating new Reaper for session: ${sessionId}`);
    return Promise.resolve(new DisabledReaper());
  }

  private static async createRealInstance(dockerClient: DockerClient): Promise<Reaper> {
    const sessionId = dockerClient.getSessionId();

    log.debug(`Creating new Reaper for session: ${sessionId}`);
    const container = await new GenericContainer(this.getImage())
      .withName(`testcontainers-ryuk-${sessionId}`)
      .withExposedPorts(8080)
      .withWaitStrategy(Wait.forLogMessage("Started!"))
      .withBindMount("/var/run/docker.sock", "/var/run/docker.sock")
      .withDaemonMode()
      .withPrivilegedMode()
      .start();

    const host = dockerClient.getHost();
    const port = container.getMappedPort(8080);

    log.debug(`Connecting to Reaper on ${host}:${port}`);
    const socket = new Socket();

    socket.unref();

    socket.on("close", () => {
      log.warn("Connection to Reaper closed");
    });

    return await new Promise((resolve) => {
      socket.connect(port, host, () => {
        log.debug(`Connected to Reaper`);
        socket.write(`label=org.testcontainers.session-id=${sessionId}\r\n`);
        const reaper = new RealReaper(sessionId, container, socket);
        resolve(reaper);
      });
    });
  }
}
