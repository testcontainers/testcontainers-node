import { AbstractStartedContainer, GenericContainer, StartedTestContainer, Wait } from "testcontainers";

const INFLUXDB_PORT = 8086;

export class InfluxDB1Container extends GenericContainer {
  private database = "test";
  private username = "test-user";
  private password = "test-password";
  private authEnabled = true;
  private adminUsername = "admin";
  private adminPassword = "admin-password";

  constructor(image: string) {
    super(image);
    this.withExposedPorts(INFLUXDB_PORT)
      .withWaitStrategy(Wait.forHttp("/ping", INFLUXDB_PORT).forStatusCode(204))
      .withStartupTimeout(120_000);
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

  public withAuthEnabled(authEnabled: boolean): this {
    this.authEnabled = authEnabled;
    return this;
  }

  public withAdminUsername(adminUsername: string): this {
    this.adminUsername = adminUsername;
    return this;
  }

  public withAdminPassword(adminPassword: string): this {
    this.adminPassword = adminPassword;
    return this;
  }

  public override async start(): Promise<StartedInfluxDB1Container> {
    this.withEnvironment({
      INFLUXDB_DB: this.database,
      INFLUXDB_HTTP_AUTH_ENABLED: String(this.authEnabled),
      INFLUXDB_ADMIN_USER: this.adminUsername,
      INFLUXDB_ADMIN_PASSWORD: this.adminPassword,
      INFLUXDB_USER: this.username,
      INFLUXDB_USER_PASSWORD: this.password,
    });

    return new StartedInfluxDB1Container(
      await super.start(),
      this.database,
      this.username,
      this.password,
      this.adminUsername,
      this.adminPassword
    );
  }
}

export class StartedInfluxDB1Container extends AbstractStartedContainer {
  constructor(
    startedTestContainer: StartedTestContainer,
    private readonly database: string,
    private readonly username: string,
    private readonly password: string,
    private readonly adminUsername: string,
    private readonly adminPassword: string
  ) {
    super(startedTestContainer);
  }

  public getPort(): number {
    return this.getMappedPort(INFLUXDB_PORT);
  }

  public getUrl(): string {
    return `http://${this.getHost()}:${this.getPort()}`;
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

  public getAdminUsername(): string {
    return this.adminUsername;
  }

  public getAdminPassword(): string {
    return this.adminPassword;
  }
}
