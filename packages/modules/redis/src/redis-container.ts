import { AbstractStartedContainer, GenericContainer, StartedTestContainer } from "testcontainers";

const REDIS_PORT = 6379;

export class RedisContainer extends GenericContainer {
  private username = "";
  private password = "";

  constructor(image = "redis:7.2") {
    super(image);
  }

  public withUsername(username: string): this {
    this.username = username;
    return this;
  }

  public withPassword(password: string): this {
    this.password = password;
    return this;
  }

  public override async start(): Promise<StartedRedisContainer> {
    this.withExposedPorts(...(this.hasExposedPorts ? this.exposedPorts : [REDIS_PORT]))
      .withCommand([
        "redis-server",
        //...(this.username != "" ? [`--masteruser "${this.username}"`] : []),
        //...(this.password != "" ? [`--masterauth "${this.password}"`] : []),
        //...(this.username != "" ? [`--user ${this.username} allcommands allkeys on`] : []),
        //...(this.password != "" ? [`--requirepass "${this.password}"`] : []),
      ])
      .withStartupTimeout(120_000);

    return new StartedRedisContainer(await super.start(), this.username, this.password);
  }
}

export class StartedRedisContainer extends AbstractStartedContainer {
  private readonly port: number;

  constructor(
    startedTestContainer: StartedTestContainer,
    private readonly username: string,
    private readonly password: string
  ) {
    super(startedTestContainer);
    this.port = startedTestContainer.getMappedPort(REDIS_PORT);
  }

  public getPort(): number {
    return this.port;
  }

  public getUsername(): string {
    return this.username;
  }

  public getPassword(): string {
    return this.password;
  }

  public getConnectionUri(): string {
    const url = new URL("", "redis://");
    url.hostname = this.getHost();
    url.port = this.getPort().toString();
    //url.username = this.getUsername();
    //url.password = this.getPassword();
    return url.toString();
  }

  public async executeCliCmd(cmd: string, additionalFlags: string[] = []): Promise<string> {
    const result = await this.startedTestContainer.exec([
      "redis-cli",
      "-h",
      this.getHost(),
      ...(this.username != "" ? [`--user ${this.username}`] : []),
      ...(this.username != "" ? [`--password ${this.password}`] : []),
      `${cmd}`,
      ...additionalFlags,
    ]);
    if (result.exitCode !== 0) {
      throw new Error(`executeQuery failed with exit code ${result.exitCode} for query: ${cmd}. ${result.output}`);
    }
    return result.output;
  }
}
