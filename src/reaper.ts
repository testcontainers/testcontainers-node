import { Socket } from "net";
import log from "./logger";
import { GenericContainer } from "./generic-container";
import { StartedTestContainer } from "./test-container";
import { Wait } from "./wait";
import { Id } from "./container";

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

  public static async start(sessionId: Id): Promise<void> {
    if (this.instance) {
      log.debug(`Reaper is already running for session: ${sessionId}`);
      return;
    }

    log.debug(`Creating new Reaper for session: ${sessionId}`);
    const container = await new GenericContainer("quay.io/testcontainers/ryuk")
      .withExposedPorts(8080)
      .withBindMount("/var/run/docker.sock", "/var/run/docker.sock")
      .withWaitStrategy(Wait.forLogMessage("Starting on port 8080"))
      .withoutAutoCleanup()
      .start();

    const host = container.getContainerIpAddress();
    const port = container.getMappedPort(8080);

    return new Promise((resolve) => {
      log.debug(`Connecting to Reaper on ${host}:${port}`);
      const socket = new Socket();
      socket.on("close", () => {
        log.debug("Connection to Reaper closed");
      });
      socket.connect(port, host, () => {
        log.debug(`Connected to Reaper`);
        this.instance = new Reaper(sessionId, container, socket);
        this.writeFilter(socket, "label", `org.testcontainers.session-id.${sessionId}`).then(resolve);
      });
    });
  }

  private static async writeFilter(socket: Socket, key: string, value: string): Promise<void> {
    return new Promise((resolve) => {
      socket.write(`${key}=${value}\r\n`, () => {
        log.debug(`Registered "${key}=${value}" with Reaper`);
        resolve();
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
