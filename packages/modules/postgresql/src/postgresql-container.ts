import { AbstractStartedContainer, GenericContainer, StartedTestContainer, Wait } from "testcontainers";

const POSTGRES_PORT = 5432;

export class PostgreSqlContainer extends GenericContainer {
  private database = "test";
  private username = "test";
  private password = "test";

  constructor(image = "postgres:13.3-alpine") {
    super(image);
    this.withExposedPorts(POSTGRES_PORT);
    this.withWaitStrategy(Wait.forHealthCheck());
    this.withStartupTimeout(120_000);
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
    this.withEnvironment({
      POSTGRES_DB: this.database,
      POSTGRES_USER: this.username,
      POSTGRES_PASSWORD: this.password,
    });
    if (!this.healthCheck) {
      this.withHealthCheck({
        test: ["CMD-SHELL", `PGPASSWORD=${this.password} psql -U ${this.username} -d ${this.database} -c 'SELECT 1;'`],
        interval: 250,
        timeout: 1000,
        retries: 1000,
      });
    }
    return new StartedPostgreSqlContainer(await super.start(), this.database, this.username, this.password);
  }
}

export class StartedPostgreSqlContainer extends AbstractStartedContainer {
  constructor(
    startedTestContainer: StartedTestContainer,
    private readonly database: string,
    private readonly username: string,
    private readonly password: string
  ) {
    super(startedTestContainer);
  }

  public getPort(): number {
    return super.getMappedPort(POSTGRES_PORT);
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
