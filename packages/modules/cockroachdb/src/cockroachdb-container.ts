import { AbstractStartedContainer, GenericContainer, StartedTestContainer, Wait } from "testcontainers";

const COCKROACH_PORT = 26257;
const COCKROACH_HTTP_PORT = 26258;

export class CockroachDbContainer extends GenericContainer {
  private database = "test";
  private username = "test";

  constructor(image = "cockroachdb/cockroach:v24.3.5") {
    super(image);
    this.withExposedPorts(COCKROACH_PORT, COCKROACH_HTTP_PORT)
      .withCommand(["start-single-node", "--insecure", `--http-addr=0.0.0.0:${COCKROACH_HTTP_PORT}`])
      .withWaitStrategy(Wait.forHealthCheck());
  }

  public withDatabase(database: string): this {
    this.database = database;
    return this;
  }

  public withUsername(username: string): this {
    this.username = username;
    return this;
  }

  public override async start(): Promise<StartedCockroachDbContainer> {
    this.withEnvironment({
      COCKROACH_DATABASE: this.database,
      COCKROACH_USER: this.username,
    });
    if (!this.healthCheck) {
      this.withHealthCheck({
        test: ["CMD-SHELL", `cockroach sql --insecure -u ${this.username} -d ${this.database} -e "SELECT 1;"`],
        interval: 250,
        timeout: 1000,
        retries: 1000,
      });
    }
    return new StartedCockroachDbContainer(await super.start(), this.database, this.username);
  }
}

export class StartedCockroachDbContainer extends AbstractStartedContainer {
  constructor(
    startedTestContainer: StartedTestContainer,
    private readonly database: string,
    private readonly username: string
  ) {
    super(startedTestContainer);
  }

  public getPort(): number {
    return this.startedTestContainer.getMappedPort(COCKROACH_PORT);
  }

  public getDatabase(): string {
    return this.database;
  }

  public getUsername(): string {
    return this.username;
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
    return url.toString();
  }
}
