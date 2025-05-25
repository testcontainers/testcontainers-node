import { AbstractStartedContainer, GenericContainer, StartedTestContainer } from "testcontainers";

const MARIADB_PORT = 3306;

export class MariaDbContainer extends GenericContainer {
  private database = "test";
  private username = "test";
  private userPassword = "test";
  private rootPassword = "test";

  constructor(image: string) {
    super(image);
    this.withExposedPorts(MARIADB_PORT).withStartupTimeout(120_000);
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

  public override async start(): Promise<StartedMariaDbContainer> {
    this.withEnvironment({
      MARIADB_DATABASE: this.database,
      MARIADB_ROOT_PASSWORD: this.rootPassword,
      MARIADB_USER: this.username,
      MARIADB_PASSWORD: this.userPassword,
    });
    return new StartedMariaDbContainer(
      await super.start(),
      this.database,
      this.username,
      this.userPassword,
      this.rootPassword
    );
  }
}

export class StartedMariaDbContainer extends AbstractStartedContainer {
  constructor(
    startedTestContainer: StartedTestContainer,
    private readonly database: string,
    private readonly username: string,
    private readonly userPassword: string,
    private readonly rootPassword: string
  ) {
    super(startedTestContainer);
  }

  public getPort(): number {
    return this.startedTestContainer.getMappedPort(MARIADB_PORT);
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
    const url = new URL("", "mariadb://");
    url.hostname = this.getHost();
    url.port = this.getPort().toString();
    url.pathname = this.getDatabase();
    url.username = isRoot ? "root" : this.getUsername();
    url.password = isRoot ? this.getRootPassword() : this.getUserPassword();
    return url.toString();
  }
}
