import { AbstractStartedContainer, GenericContainer, StartedTestContainer, Wait } from "testcontainers";

const IMAGE_NAME = "clickhouse/clickhouse-server";
const DEFAULT_IMAGE_VER = "23.3.8.21-alpine"

const HTTP_PORT = 8123;
const NATIVE_PORT = 9000;

export class ClickhouseContainer extends GenericContainer {
  private database = "test";
  private username = "test";
  private password = "test";

  constructor(imageVer = DEFAULT_IMAGE_VER) {
    super(`${IMAGE_NAME}:${imageVer}`);
  }

  public withDatabase(database: string): this {
    this.database = database;
    return this;
  }

  public withUsername(username: string): this {
    this.username = username;
    return this;
  }

  public withPassword(password: string): this {
    this.password = password;
    return this;
  }

  public override async start(): Promise<StartedClickhouseContainer> {
    this.withExposedPorts(...(this.hasExposedPorts ? this.exposedPorts : [HTTP_PORT, NATIVE_PORT]))
      .withEnvironment({
        CLICKHOUSE_DB: this.database,
        CLICKHOUSE_USER: this.username,
        CLICKHOUSE_PASSWORD: this.password,
      })
      .withWaitStrategy(Wait.forHttp(`/ping`, HTTP_PORT)
        .forStatusCode(200))
      .withStartupTimeout(120_000);
    
    return new StartedClickhouseContainer(
      await super.start(),
      HTTP_PORT,
      NATIVE_PORT,
      this.database,
      this.username,
      this.password,
    );
  }
}

export class StartedClickhouseContainer extends AbstractStartedContainer {
  private readonly hostHttpPort: number;
  private readonly hostNativePort: number;

  constructor(
    startedTestContainer: StartedTestContainer,
    httpPort: number,
    nativePort: number,
    private readonly database: string,
    private readonly username: string,
    private readonly password: string,
  ) {
    super(startedTestContainer);
    this.hostHttpPort = startedTestContainer.getMappedPort(httpPort);
    this.hostNativePort = startedTestContainer.getMappedPort(nativePort);
  }

  public getHttpUrl(): string {
    return this.toUrl("http", this.hostHttpPort)
  }

  public getNativeUrl(schema: string): string {
    return this.toUrl(schema, this.hostNativePort)
  }

  private toUrl(schema: string, port: number): string {
    return `${schema}://${this.startedTestContainer.getHost()}:${port}`
  }

  public getDatabase(): string {
    return this.database;
  }

  public getUsername(): string {
    return this.username;
  }

  public getPassword(): string {
    return this.password;
  }
}