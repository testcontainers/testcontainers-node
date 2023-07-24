import { AbstractStartedContainer, GenericContainer, StartedTestContainer, Wait } from "@testcontainers/testcontainers";

const POSTGRES_PORT = 5432;

export class PostgreSqlContainer extends GenericContainer {
  private database = "test";
  private username = "test";
  private password = "test";

  constructor(image = "postgres:13.3-alpine") {
    super(image);
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

  public override async start(): Promise<StartedPostgreSqlContainer> {
    this.withExposedPorts(...(this.hasExposedPorts ? this.exposedPorts : [POSTGRES_PORT]))
      .withEnvironment({
        POSTGRES_DB: this.database,
        POSTGRES_USER: this.username,
        POSTGRES_PASSWORD: this.password,
      })
      .withWaitStrategy(Wait.forLogMessage(/.*database system is ready to accept connections.*/, 2))
      .withStartupTimeout(120_000);

    return new StartedPostgreSqlContainer(await super.start(), this.database, this.username, this.password);
  }
}

export class StartedPostgreSqlContainer extends AbstractStartedContainer {
  private readonly port: number;

  constructor(
    startedTestContainer: StartedTestContainer,
    private readonly database: string,
    private readonly username: string,
    private readonly password: string
  ) {
    super(startedTestContainer);
    this.port = startedTestContainer.getMappedPort(5432);
  }

  public getPort(): number {
    return this.port;
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

  /**
   * @returns A connection URI in the form of `postgres[ql]://[username[:password]@][host[:port],]/database`
   */
  public getConnectionUri(): string {
    const url = new URL("", "postgres://");
    url.hostname = this.getHost();
    url.port = this.getPort().toString();
    url.pathname = this.getDatabase();
    url.username = this.getUsername();
    url.password = this.getPassword();
    return url.toString();
  }
}
