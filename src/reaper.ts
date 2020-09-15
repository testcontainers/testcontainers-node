import { Socket } from "net";
import log from "./logger";
import { GenericContainer } from "./generic-container";
import { StartedTestContainer } from "./test-container";
import { Wait } from "./wait";
import { Id } from "./container";
import { DockerClient } from "./docker-client";

export class Reaper {
  private static instance: Reaper;

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

  public static async start(dockerClient: DockerClient): Promise<void> {
    const sessionId = dockerClient.getSessionId();
    const socketPath = dockerClient.getSocketPath();

    if (this.instance) {
      log.debug(`Reaper is already running for session: ${sessionId}`);
      return;
    }

    log.debug(`Creating new Reaper for session: ${sessionId}`);
    const container = await new GenericContainer("quay.io/testcontainers/ryuk")
      .withExposedPorts(8080)
      .withBindMount(socketPath, "/var/run/docker.sock")
      .withWaitStrategy(Wait.forLogMessage("Starting on port 8080"))
      .withoutAutoCleanup()
      .start();

    const host = container.getContainerIpAddress();
    const port = container.getMappedPort(8080);

    await new Promise((resolve) => {
      log.debug(`Connecting to Reaper on ${host}:${port}`);
      const socket = new Socket();

      socket.on("close", () => {
        log.debug("Connection to Reaper closed");
      });

      let ackCount = 0;
      socket.on("data", (chunk) => {
        chunk
          .toString()
          .split("\n")
          .map((line) => line.trim())
          .forEach((line) => {
            if (line === "ACK") {
              ackCount++;
            }
          });
        if (ackCount === 2) {
          resolve();
        }
      });

      socket.connect(port, host, () => {
        log.debug(`Connected to Reaper`);
        this.instance = new Reaper(sessionId, container, socket);

        socket.write(`label=org.testcontainers.session-id=${sessionId}\r\n`);
        socket.write(`label=com.docker.compose.project=testcontainers-${sessionId}\r\n`);
      });
    });
  }

  public async shutDown(): Promise<void> {
    return new Promise((resolve) => {
      log.debug(`Shutting down reaper for session: ${this.sessionId}`);
      this.socket.end(resolve);
    });
  }
}
