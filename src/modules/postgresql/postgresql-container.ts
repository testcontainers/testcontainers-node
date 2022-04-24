import { GenericContainer } from "../../generic-container/generic-container";
import { StartedTestContainer } from "../../test-container";
import { RandomUuid } from "../../uuid";
import { AbstractStartedContainer } from "../abstract-started-container";
import { Port } from "../../port";

const POSTGRES_PORT = 5432;

export class PostgreSqlContainer extends GenericContainer {
  private database = "test";
  private username = new RandomUuid().nextUuid();
  private password = new RandomUuid().nextUuid();
  private hostPort: number | null = null;

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

  public withHostPort(port: number): this {
    this.hostPort = port;
    return this;
  }

  public async start(): Promise<StartedPostgreSqlContainer> {
    this.withExposedPorts(this.hostPort ? { container: POSTGRES_PORT, host: this.hostPort } : POSTGRES_PORT)
      .withEnv("POSTGRES_DB", this.database)
      .withEnv("POSTGRES_USER", this.username)
      .withEnv("POSTGRES_PASSWORD", this.password)
      .withStartupTimeout(120_000);

    return new StartedPostgreSqlContainer(await super.start(), this.database, this.username, this.password);
  }
}

export class StartedPostgreSqlContainer extends AbstractStartedContainer {
  private readonly port: Port;

  constructor(
    startedTestContainer: StartedTestContainer,
    private readonly database: string,
    private readonly username: string,
    private readonly password: string
  ) {
    super(startedTestContainer);
    this.port = startedTestContainer.getMappedPort(5432);
  }

  public getPort(): Port {
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
}
