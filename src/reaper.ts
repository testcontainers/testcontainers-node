import { Socket } from "net";
import { log } from "./logger";
import { GenericContainer } from "./generic-container";
import { StartedTestContainer } from "./test-container";
import { Wait } from "./wait";
import { Id } from "./container";
import { DockerClient } from "./docker-client";

export class Reaper {
  public static IMAGE_NAME = "testcontainers/ryuk";

  private static instance: Reaper;
  private static instancePromise: Promise<Reaper>;

  constructor(
    private readonly sessionId: Id,
    private readonly container: StartedTestContainer,
    private readonly socket: Socket
  ) {}

  public static isRunning(): boolean {
    return this.instance !== undefined;
  }

  public static getInstance(): Reaper {
    return this.instance;
  }

  public static async start(dockerClient: DockerClient): Promise<Reaper> {
    const sessionId = dockerClient.getSessionId();

    if (this.instance) {
      return this.instancePromise;
    } else if (this.instancePromise) {
      log.debug(`Reaper creation in progress for session: ${sessionId}`);
      return this.instancePromise;
    } else {
      this.instancePromise = new Promise(async (resolve) => {
        log.debug(`Creating new Reaper for session: ${sessionId}`);
        const container = await new GenericContainer(this.IMAGE_NAME, "0.3.0")
          .withName(`ryuk-${sessionId}`)
          .withExposedPorts(8080)
          .withBindMount(dockerClient.getSocketPath(), "/var/run/docker.sock")
          .withWaitStrategy(Wait.forLogMessage("Starting on port 8080"))
          .withoutAutoCleanup()
          .start();

        const host = container.getContainerIpAddress();
        const port = container.getMappedPort(8080);

        log.debug(`Connecting to Reaper on ${host}:${port}`);
        const socket = new Socket();

        socket.on("close", () => {
          log.debug("Connection to Reaper closed");
        });

        socket.connect(port, host, () => {
          log.debug(`Connected to Reaper`);
          socket.write(`label=org.testcontainers.session-id=${sessionId}\r\n`);
          this.instance = new Reaper(sessionId, container, socket);
          resolve(this.instance);
        });
      });

      return this.instancePromise;
    }
  }

  public addProject(projectName: string): void {
    this.socket.write(`label=com.docker.compose.project=${projectName}\r\n`);
  }

  public async shutDown(): Promise<void> {
    return new Promise((resolve) => {
      log.debug(`Shutting down reaper for session: ${this.sessionId}`);
      this.socket.end(resolve);
    });
  }
}
