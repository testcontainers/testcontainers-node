import { AbstractStartedContainer, GenericContainer, StartedTestContainer, Wait } from "testcontainers";
import path from "path";

const REDIS_PORT = 6379;

export class RedisContainer extends GenericContainer {
  private readonly importFilePath = "/tmp/import.redis";
  private password? = "";
  private persistenceVolume? = "";
  private initialImportScriptFile? = "";

  constructor(image = "redis:7.2") {
    super(image);
    this.withExposedPorts(REDIS_PORT)
      .withStartupTimeout(120_000)
      .withWaitStrategy(Wait.forLogMessage("Ready to accept connections tcp"));
  }

  public withPassword(password: string): this {
    this.password = password;
    return this;
  }

  public withPersistence(sourcePath: string): this {
    this.persistenceVolume = sourcePath;
    return this;
  }

  /* Expect data to be in redis import script format, see https://developer.redis.com/explore/import/*/
  public withInitialData(importScriptFile: string): this {
    this.initialImportScriptFile = importScriptFile;
    return this;
  }

  public override async start(): Promise<StartedRedisContainer> {
    this.withCommand([
      "redis-server",
      ...(this.password ? [`--requirepass "${this.password}"`] : []),
      ...(this.persistenceVolume ? ["--save 1 1 ", "--appendonly yes"] : []),
    ]);
    if (this.persistenceVolume) {
      this.withBindMounts([{ mode: "rw", source: this.persistenceVolume, target: "/data" }]);
    }
    if (this.initialImportScriptFile) {
      this.withCopyFilesToContainer([
        {
          mode: 666,
          source: this.initialImportScriptFile,
          target: this.importFilePath,
        },
        {
          mode: 777,
          source: path.join(__dirname, "import.sh"),
          target: "/tmp/import.sh",
        },
      ]);
    }
    const startedRedisContainer = new StartedRedisContainer(await super.start(), this.password);
    if (this.initialImportScriptFile) await this.importInitialData(startedRedisContainer);
    return startedRedisContainer;
  }

  private async importInitialData(container: StartedRedisContainer) {
    const re = await container.exec(`/tmp/import.sh ${this.password}`);
    if (re.exitCode != 0 || re.output.includes("ERR"))
      throw Error(`Could not import initial data from ${this.initialImportScriptFile}: ${re.output}`);
  }
}

export class StartedRedisContainer extends AbstractStartedContainer {
  constructor(startedTestContainer: StartedTestContainer, private readonly password?: string) {
    super(startedTestContainer);
  }

  public getPort(): number {
    return this.getMappedPort(REDIS_PORT);
  }

  public getPassword(): string {
    return this.password ? this.password.toString() : "";
  }

  public getConnectionUrl(): string {
    const url = new URL("", "redis://");
    url.hostname = this.getHost();
    url.port = this.getPort().toString();
    url.password = this.getPassword();
    return url.toString();
  }

  public async executeCliCmd(cmd: string, additionalFlags: string[] = []): Promise<string> {
    const result = await this.startedTestContainer.exec([
      "redis-cli",
      ...(this.password != "" ? [`-a ${this.password}`] : []),
      `${cmd}`,
      ...additionalFlags,
    ]);
    if (result.exitCode !== 0) {
      throw new Error(`executeQuery failed with exit code ${result.exitCode} for query: ${cmd}. ${result.output}`);
    }
    return result.output;
  }
}
