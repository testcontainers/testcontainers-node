import { Socket } from "net";
import { log } from "./logger";
import { GenericContainer } from "./generic-container";
import { StartedTestContainer } from "./test-container";
import { Wait } from "./wait";
import { Id } from "./container";
import { DockerClient } from "./docker-client";

export class Reaper {
  public static IMAGE_NAME = "testcontainers/ryuk";

  private static instance: Promise<Reaper>;

  constructor(
    private readonly sessionId: Id,
    private readonly container: StartedTestContainer,
    private readonly socket: Socket
  ) {}

  public static async start(dockerClient: DockerClient): Promise<Reaper> {
    if (!this.instance) {
      this.instance = this.createInstance(dockerClient);
    }
    return this.instance;
  }

  private static async createInstance(dockerClient: DockerClient): Promise<Reaper> {
    const sessionId = dockerClient.getSessionId();

    log.debug(`Creating new Reaper for session: ${sessionId}`);
    const container = new GenericContainer(this.IMAGE_NAME, "0.3.0")
      .withName(`ryuk-${sessionId}`)
      .withExposedPorts(8080)
      .withWaitStrategy(Wait.forLogMessage("Started!"))
      .withDaemonMode()
      .withPrivilegedMode();

    const socketPath = await dockerClient.getSocketPath();

    if (socketPath) {
      log.debug(`Mounting socket into Reaper: ${socketPath}`);
      container.withBindMount(socketPath, "/var/run/docker.sock");
    } else if (process.env.DOCKER_HOST) {
      log.debug(`Setting DOCKER_HOST into Reaper: ${socketPath}`);
      container.withEnv("DOCKER_HOST", process.env.DOCKER_HOST);
    }

    const startedContainer = await container.start();

    const host = dockerClient.getHost();
    const port = startedContainer.getMappedPort(8080);

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
        const reaper = new Reaper(sessionId, startedContainer, socket);
        resolve(reaper);
      });
    });
  }

  public addProject(projectName: string): void {
    this.socket.write(`label=com.docker.compose.project=${projectName}\r\n`);
  }
}
