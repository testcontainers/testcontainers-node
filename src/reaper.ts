import { Socket } from "net";
import log from "./logger";
import { GenericContainer } from "./generic-container";
import { StartedTestContainer } from "./test-container";
import { Wait } from "./wait";

export class Reaper {
  private static instance: Reaper;

  constructor(private readonly container: StartedTestContainer, private readonly socket: Socket) {}

  public static isRunning(): boolean {
    return this.instance !== undefined;
  }

  public static async getReaper(): Promise<Reaper> {
    if (this.instance) {
      log.debug("Using existing Reaper");
      return this.instance;
    }

    log.debug("Creating new Reaper");
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
      socket.connect(port, host, () => {
        log.debug(`Connected to Reaper`);
        this.instance = new Reaper(container, socket);
        resolve(this.instance);
      });
    });
  }

  public async add(key: string, value: string) {
    log.debug(`Registering "${key}=${value}" with Reaper`);
    return new Promise((resolve) => {
      this.socket.write(`${key}=${value}\r\n`, () => {
        log.debug(`Registered "${key}=${value}" with Reaper`);
        resolve();
      });
    });
  }

  public async shutDown(): Promise<void> {
    return new Promise((resolve) => this.socket.end(resolve));
  }
}
