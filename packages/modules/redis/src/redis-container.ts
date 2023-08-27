import { AbstractStartedContainer, GenericContainer, StartedTestContainer } from "testcontainers";

const REDIS_PORT = 6379;

export class RedisContainer extends GenericContainer {
  private password = "";
  private persistenceVolume = "";

  constructor(image = "redis:7.2") {
    super(image);
  }

  public withPassword(password: string): this {
    this.password = password;
    return this;
  }

  public withPersistence(sourcePath: string): this {
    this.persistenceVolume = sourcePath;
    return this;
  }

  public override async start(): Promise<StartedRedisContainer> {
    this.withExposedPorts(...(this.hasExposedPorts ? this.exposedPorts : [REDIS_PORT]))
      .withCommand([
        "redis-server",
        ...(this.password != "" ? [`--requirepass "${this.password}"`] : []),
        ...(this.persistenceVolume != "" ? ["--save 1 1 ", "--appendonly yes"] : []),
      ])
      .withStartupTimeout(120_000);
    if (this.persistenceVolume != "")
      this.withBindMounts([{ mode: "rw", source: this.persistenceVolume, target: "/data" }]);

    return new StartedRedisContainer(await super.start(), this.password);
  }
}

export class StartedRedisContainer extends AbstractStartedContainer {
  constructor(startedTestContainer: StartedTestContainer, private readonly password: string) {
    super(startedTestContainer);
  }

  public getPort(): number {
    return this.getMappedPort(REDIS_PORT);
  }

  public getPassword(): string {
    return this.password;
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
      "-h",
      this.getHost(),
      ...(this.password != "" ? [`--password ${this.password}`] : []),
      `${cmd}`,
      ...additionalFlags,
    ]);
    if (result.exitCode !== 0) {
      throw new Error(`executeQuery failed with exit code ${result.exitCode} for query: ${cmd}. ${result.output}`);
    }
    return result.output;
  }
}
