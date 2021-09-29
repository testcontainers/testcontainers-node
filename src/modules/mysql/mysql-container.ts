import { GenericContainer } from "../../generic-container/generic-container";
import { StartedTestContainer } from "../../test-container";
import { RandomUuid } from "../../uuid";
import { AbstractStartedContainer } from "../abstract-started-container";
import { Port } from "../../port";

export class MySqlContainer extends GenericContainer {
  private database = "test";
  private username = new RandomUuid().nextUuid();
  private userPassword = new RandomUuid().nextUuid();
  private rootPassword = new RandomUuid().nextUuid();

  constructor(image = "mysql:8.0.26") {
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

  public withRootPassword(rootPassword: string): this {
    this.rootPassword = rootPassword;
    return this;
  }

  public withUserPassword(userPassword: string): this {
    this.userPassword = userPassword;
    return this;
  }

  public async start(): Promise<StartedMySqlContainer> {
    this.withExposedPorts(3306)
      .withEnv("MYSQL_DATABASE", this.database)
      .withEnv("MYSQL_ROOT_PASSWORD", this.rootPassword)
      .withEnv("MYSQL_USER", this.username)
      .withEnv("MYSQL_PASSWORD", this.userPassword)
      .withStartupTimeout(120_000);

    return new StartedMySqlContainer(
      await super.start(),
      this.database,
      this.username,
      this.userPassword,
      this.rootPassword
    );
  }
}

export class StartedMySqlContainer extends AbstractStartedContainer {
  private readonly port: Port;

  constructor(
    startedTestContainer: StartedTestContainer,
    private readonly database: string,
    private readonly username: string,
    private readonly userPassword: string,
    private readonly rootPassword: string
  ) {
    super(startedTestContainer);
    this.port = startedTestContainer.getMappedPort(3306);
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

  public getUserPassword(): string {
    return this.userPassword;
  }

  public getRootPassword(): string {
    return this.rootPassword;
  }

  public async executeQuery(query: string, additionalFlags: string[] = []): Promise<string> {
    const result = await this.startedTestContainer.exec([
      "mysql",
      "-u",
      this.username,
      `-p${this.userPassword}`,
      "-e",
      `${query};`,
      ...additionalFlags,
    ]);
    if (result.exitCode !== 0) {
      throw new Error(`executeQuery failed with exit code ${result.exitCode} for query: ${query}`);
    }
    return result.output;
  }
}
