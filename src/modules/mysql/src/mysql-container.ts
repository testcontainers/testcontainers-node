import { AbstractStartedContainer, GenericContainer, StartedTestContainer } from "@testcontainers/testcontainers";

const MYSQL_PORT = 3306;

export class MySqlContainer extends GenericContainer {
  private database = "test";
  private username = "test";
  private userPassword = "test";
  private rootPassword = "test";

  constructor(image = "mysql:8.0.31") {
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

  public override async start(): Promise<StartedMySqlContainer> {
    this.withExposedPorts(...(this.hasExposedPorts ? this.exposedPorts : [MYSQL_PORT]))
      .withEnvironment({
        MYSQL_DATABASE: this.database,
        MYSQL_ROOT_PASSWORD: this.rootPassword,
        MYSQL_USER: this.username,
        MYSQL_PASSWORD: this.userPassword,
      })
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
  private readonly port: number;

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

  public getPort(): number {
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

  public getConnectionUri(isRoot = false): string {
    const url = new URL("", "mysql://");
    url.hostname = this.getHost();
    url.port = this.getPort().toString();
    url.pathname = this.getDatabase();
    url.username = isRoot ? "root" : this.getUsername();
    url.password = isRoot ? this.getRootPassword() : this.getUserPassword();
    return url.toString();
  }

  public async executeQuery(query: string, additionalFlags: string[] = []): Promise<string> {
    const result = await this.startedTestContainer.exec([
      "mysql",
      "-h",
      "127.0.0.1",
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
