import { GenericContainer } from "../../generic-container/generic-container";
import { StartedTestContainer } from "../../test-container";
import { RandomUuid } from "../../uuid";
import { AbstractStartedContainer } from "../abstract-started-container";
import { Port } from "../../port";

export class PostgreSqlContainer extends GenericContainer {
  private database = "test";
  private username = new RandomUuid().nextUuid();
  private password = new RandomUuid().nextUuid();

  constructor(image = "postgres:13.3-alpine") {
    super(image);
    this.withExposedPorts(5432);
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

  public async start(): Promise<StartedPostgreSqlContainer> {
    this.withEnv("POSTGRES_DB", this.database)
      .withEnv("POSTGRES_USER", this.username)
      .withEnv("POSTGRES_PASSWORD", this.password);

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
