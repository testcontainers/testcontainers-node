import { Socket } from "net";
import { log } from "./logger";
import { GenericContainer } from "./generic-container/generic-container";
import { StartedTestContainer } from "./test-container";
import { sessionId } from "./docker/session-id";
import { REAPER_IMAGE } from "./images";
import { getContainerPort, PortWithOptionalBinding } from "./port";
import { LABEL_SESSION_ID } from "./labels";
import { Wait } from "./wait";

export interface Reaper {
  addProject(projectName: string): void;

  getContainerId(): string;

  stop(): void;
}

class RealReaper implements Reaper {
  constructor(private readonly container: StartedTestContainer, private readonly socket: Socket) {}

  public addProject(projectName: string): void {
    this.socket.write(`label=com.docker.compose.project=${projectName}\r\n`);
  }

  public getContainerId(): string {
    return this.container.getId();
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

  public getContainerId(): string {
    return "";
  }
}

export class ReaperInstance {
  private static instance?: Promise<Reaper>;

  public static async getInstance(): Promise<Reaper> {
    if (!this.instance) {
      if (this.isEnabled()) {
        this.instance = this.createRealInstance();
      } else {
        this.instance = this.createDisabledInstance();
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

  private static isEnabled(): boolean {
    return process.env.TESTCONTAINERS_RYUK_DISABLED !== "true";
  }

  private static isPrivileged(): boolean {
    return process.env.TESTCONTAINERS_RYUK_PRIVILEGED === "true";
  }

  private static createDisabledInstance(): Promise<Reaper> {
    log.debug(`Not creating new Reaper for session: ${sessionId}`);
    return Promise.resolve(new DisabledReaper());
  }

  private static async createRealInstance(): Promise<Reaper> {
    const dockerSocket = process.env["TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE"] ?? "/var/run/docker.sock";

    const containerPort: PortWithOptionalBinding = process.env["TESTCONTAINERS_RYUK_PORT"]
      ? { container: 8080, host: Number(process.env["TESTCONTAINERS_RYUK_PORT"]) }
      : 8080;

    log.debug(`Creating new Reaper for session: ${sessionId}`);
    const container = new GenericContainer(REAPER_IMAGE)
      .withName(`testcontainers-ryuk-${sessionId}`)
      .withExposedPorts(containerPort)
      .withBindMounts([{ source: dockerSocket, target: "/var/run/docker.sock" }])
      .withWaitStrategy(Wait.forLogMessage(/.+ Started!/));

    if (this.isPrivileged()) {
      container.withPrivilegedMode();
    }

    const startedContainer = await container.start();
    const containerId = startedContainer.getId();

    const host = startedContainer.getHost();
    const port = startedContainer.getMappedPort(8080);

    log.debug(`Connecting to Reaper ${containerId} on ${host}:${port}`);
    const socket = new Socket();

    socket.unref();

    socket
      .on("timeout", () => log.error(`Reaper ${containerId} socket timed out`))
      .on("error", (err) => log.error(`Reaper ${containerId} socket error: ${err}`))
      .on("close", (hadError) => {
        if (hadError) {
          log.error(`Connection to Reaper ${containerId} closed with error`);
        } else {
          log.warn(`Connection to Reaper ${containerId} closed`);
        }
      });

    return new Promise((resolve) => {
      socket.connect(getContainerPort(port), host, () => {
        log.debug(`Connected to Reaper ${containerId}`);
        socket.write(`label=${LABEL_SESSION_ID}=${sessionId}\r\n`);
        const reaper = new RealReaper(startedContainer, socket);
        resolve(reaper);
      });
    });
  }
}
