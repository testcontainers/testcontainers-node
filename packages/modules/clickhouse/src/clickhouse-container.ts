import { AbstractStartedContainer, GenericContainer, StartedTestContainer, Wait } from "testcontainers";

const CLICKHOUSE_PORT = 9000;
const CLICKHOUSE_HTTP_PORT = 8123;

export class ClickHouseContainer extends GenericContainer {
  private username = "test";
  private password = "test";
  private database = "test";

  constructor(image = "clickhouse/clickhouse-server:24") {
    super(image);
    this.withExposedPorts(CLICKHOUSE_PORT, CLICKHOUSE_HTTP_PORT);
    this.withWaitStrategy(
      Wait.forHttp("/", CLICKHOUSE_HTTP_PORT).forResponsePredicate((response) => response === "Ok.\n")
    );
    this.withStartupTimeout(120_000);
    this.withDatabase("test");
    this.withUlimits({
      nofile: {
        hard: 262144,
        soft: 262144,
      },
    });
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

  public override async start(): Promise<StartedClickHouseContainer> {
    this.withEnvironment({
      CLICKHOUSE_USER: this.username,
      CLICKHOUSE_PASSWORD: this.password,
      CLICKHOUSE_DB: this.database,
      CLICKHOUSE_DEFAULT_ACCESS_MANAGEMENT: "1",
    });

    return new StartedClickHouseContainer(await super.start(), this.database, this.username, this.password);
  }
}

export class StartedClickHouseContainer extends AbstractStartedContainer {
  constructor(
    startedTestContainer: StartedTestContainer,
    private readonly database: string,
    private readonly username: string,
    private readonly password: string
  ) {
    super(startedTestContainer);
  }

  public getPort(): number {
    return super.getMappedPort(CLICKHOUSE_PORT);
  }

  public getHttpPort(): number {
    return super.getMappedPort(CLICKHOUSE_HTTP_PORT);
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

  public getConnectionUri(): string {
    const protocol = "http";
    const host = this.getHost();
    const port = this.getHttpPort();

    return `${protocol}://${host}:${port}`;
  }

  // /**
  //  * @returns A connection URI for HTTP interface in the form of `http://[username[:password]@][host[:port]]`
  //  */
  // public getHttpConnectionUri(): string {
  //   const url = new URL(`http://127.0.0.1:${this.getHttpPort()}`);
  //   return url.toString();
  // }
}
