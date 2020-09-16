import { Socket } from "net";
import { log } from "./logger";
import { GenericContainer } from "./generic-container";
import { StartedTestContainer } from "./test-container";
import { Wait } from "./wait";
import { Id } from "./container";
import { DockerClient } from "./docker-client";
import { Duration, TemporalUnit } from "node-duration";

export class Reaper {
  public static IMAGE_NAME = "testcontainers/ryuk";

  private static instance: Promise<Reaper>;

  constructor(
    private readonly sessionId: Id,
    private readonly container: StartedTestContainer,
    private readonly socket: Socket
  ) {}

  public static async start(dockerClient: DockerClient): Promise<Reaper> {
    if (this.instance) {
      return this.instance;
    }

    const sessionId = dockerClient.getSessionId();

    this.instance = new Promise(async (resolve) => {
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
        const reaper = new Reaper(sessionId, container, socket);
        process.on("exit", () => reaper.shutDown());
        resolve(reaper);
      });
    });

    return await this.instance;
  }

  public addProject(projectName: string): void {
    this.socket.write(`label=com.docker.compose.project=${projectName}\r\n`);
  }

  public async shutDown(): Promise<void> {
    await new Promise((resolve) => {
      log.debug(`Shutting down reaper for session: ${this.sessionId}`);
      this.socket.end(resolve);
    });
    await this.container.stop({ timeout: new Duration(0, TemporalUnit.MILLISECONDS) });
  }
}
