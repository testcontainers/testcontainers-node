import { AbstractStartedContainer, GenericContainer, StartedTestContainer, Wait } from "testcontainers";

const IMAGE_NAME = "clickhouse/clickhouse-server";
const DEFAULT_IMAGE_VER = "23.3.8.21-alpine";

// The official clickhouse-js client doesn't support the native protocol for now. See https://github.com/ClickHouse/clickhouse-js
// However, clickhouse-client implements the native protocol so its useful to expose the native ports. See https://clickhouse.com/docs/en/interfaces/cli#clickhouse-client

const HTTP_PORT = 8123;
const HTTPS_PORT = 8443;
const NATIVE_TCP_PORT = 9000;
const NATIVE_TCPS_PORT = 9440;

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
    this.withExposedPorts(
      ...(this.hasExposedPorts ? this.exposedPorts : [HTTP_PORT, HTTPS_PORT, NATIVE_TCP_PORT, NATIVE_TCPS_PORT])
    )
      .withEnvironment({
        CLICKHOUSE_DB: this.database,
        CLICKHOUSE_USER: this.username,
        CLICKHOUSE_PASSWORD: this.password,
      })
      .withWaitStrategy(Wait.forHttp("/ping", HTTP_PORT).forStatusCode(200))
      .withStartupTimeout(120_000);
    return new StartedClickhouseContainer(
      await super.start(),
      HTTP_PORT,
      HTTPS_PORT,
      NATIVE_TCP_PORT,
      NATIVE_TCPS_PORT,
      this.database,
      this.username,
      this.password
    );
  }
}

export class StartedClickhouseContainer extends AbstractStartedContainer {
  private readonly hostHttpPort: number;
  private readonly hostHttpsPort: number;
  private readonly hostNativeTcpPort: number;
  private readonly hostNativeTcpsPort: number;

  constructor(
    startedTestContainer: StartedTestContainer,
    httpPort: number,
    httpsPort: number,
    nativeTcpPort: number,
    nativeTcpsPort: number,
    private readonly database: string,
    private readonly username: string,
    private readonly password: string
  ) {
    super(startedTestContainer);
    this.hostHttpPort = startedTestContainer.getMappedPort(httpPort);
    this.hostHttpsPort = startedTestContainer.getMappedPort(httpsPort);
    this.hostNativeTcpPort = startedTestContainer.getMappedPort(nativeTcpPort);
    this.hostNativeTcpsPort = startedTestContainer.getMappedPort(nativeTcpsPort);
  }

  public getHttpUrl(): string {
    return this.toUrl("http", this.hostHttpPort);
  }

  public getHttpsUrl(): string {
    return this.toUrl("https", this.hostHttpsPort);
  }

  private toUrl(schema: string, port: number): string {
    return `${schema}://${this.startedTestContainer.getHost()}:${port}`;
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
