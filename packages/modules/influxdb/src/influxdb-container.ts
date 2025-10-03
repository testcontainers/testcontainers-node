import { AbstractStartedContainer, GenericContainer, StartedTestContainer, Wait } from "testcontainers";

const INFLUXDB_PORT = 8086;

export class InfluxDBContainer extends GenericContainer {
  private username = "test-user";
  private password = "test-password";
  private organization = "test-org";
  private bucket = "test-bucket";
  private retention?: string;
  private adminToken?: string;
  private readonly httpWait = Wait.forHttp("/ping", INFLUXDB_PORT).forStatusCode(204);

  // InfluxDB 1.x specific properties
  private authEnabled = true;
  private admin = "admin";
  private adminPassword = "password";
  private database?: string;

  private isVersion2: boolean = true;

  constructor(image: string) {
    super(image);
    // Determine version from image tag (default to v2 if unknown)
    this.isVersion2 = this.isInfluxDB2(this.imageName.tag ?? "latest");

    this.withExposedPorts(INFLUXDB_PORT)
      .withWaitStrategy(this.httpWait.withStartupTimeout(120_000))
      .withStartupTimeout(120_000);

    // Add basic credentials to the wait strategy
    this.httpWait.withBasicCredentials(this.username, this.password);
  }

  public withUsername(username: string): this {
    this.username = username;
    // keep wait strategy credentials up to date (mainly relevant for 1.x)
    this.httpWait.withBasicCredentials(this.username, this.password);
    return this;
  }

  public withPassword(password: string): this {
    this.password = password;
    // keep wait strategy credentials up to date (mainly relevant for 1.x)
    this.httpWait.withBasicCredentials(this.username, this.password);
    return this;
  }

  public withOrganization(organization: string): this {
    this.organization = organization;
    return this;
  }

  public withBucket(bucket: string): this {
    this.bucket = bucket;
    return this;
  }

  public withRetention(retention: string): this {
    this.retention = retention;
    return this;
  }

  public withAdminToken(adminToken: string): this {
    this.adminToken = adminToken;
    return this;
  }

  // InfluxDB 1.x specific methods
  public withAuthEnabled(authEnabled: boolean): this {
    this.authEnabled = authEnabled;
    return this;
  }

  public withAdmin(admin: string): this {
    this.admin = admin;
    return this;
  }

  public withAdminPassword(adminPassword: string): this {
    this.adminPassword = adminPassword;
    return this;
  }

  public withDatabase(database: string): this {
    this.database = database;
    return this;
  }

  public override async start(): Promise<StartedInfluxDBContainer> {
    // Re-evaluate version based on the final image tag
    this.isVersion2 = this.isInfluxDB2(this.imageName.tag ?? "latest");
    if (this.isVersion2) {
      this.configureInfluxDB2();
    } else {
      this.configureInfluxDB1();
    }

    return new StartedInfluxDBContainer(
      await super.start(),
      this.username,
      this.password,
      this.organization,
      this.bucket,
      this.database,
      this.adminToken,
      this.isVersion2
    );
  }

  private configureInfluxDB2(): void {
    const env: Record<string, string> = {
      DOCKER_INFLUXDB_INIT_MODE: "setup",
      DOCKER_INFLUXDB_INIT_USERNAME: this.username,
      DOCKER_INFLUXDB_INIT_PASSWORD: this.password,
      DOCKER_INFLUXDB_INIT_ORG: this.organization,
      DOCKER_INFLUXDB_INIT_BUCKET: this.bucket,
    };

    if (this.retention) {
      env.DOCKER_INFLUXDB_INIT_RETENTION = this.retention;
    }

    if (this.adminToken) {
      env.DOCKER_INFLUXDB_INIT_ADMIN_TOKEN = this.adminToken;
    }

    this.withEnvironment(env);
  }

  private configureInfluxDB1(): void {
    const env: Record<string, string> = {
      INFLUXDB_USER: this.username,
      INFLUXDB_USER_PASSWORD: this.password,
      INFLUXDB_HTTP_AUTH_ENABLED: String(this.authEnabled),
      INFLUXDB_ADMIN_USER: this.admin,
      INFLUXDB_ADMIN_PASSWORD: this.adminPassword,
    };

    if (this.database) {
      env.INFLUXDB_DB = this.database;
    }

    this.withEnvironment(env);
  }

  private isInfluxDB2(tag: string): boolean {
    if (tag === "latest") {
      return true; // Assume latest is v2
    }

    // Parse version number
    const versionMatch = tag.match(/^(\d+)(?:\.(\d+))?/);
    if (versionMatch) {
      const majorVersion = parseInt(versionMatch[1], 10);
      return majorVersion >= 2;
    }

    return true; // Default to v2 if unable to parse
  }
}

export class StartedInfluxDBContainer extends AbstractStartedContainer {
  constructor(
    startedTestContainer: StartedTestContainer,
    private readonly username: string,
    private readonly password: string,
    private readonly organization: string,
    private readonly bucket: string,
    private readonly database?: string,
    private readonly adminToken?: string,
    private readonly isVersion2: boolean = true
  ) {
    super(startedTestContainer);
  }

  public getPort(): number {
    return this.getMappedPort(INFLUXDB_PORT);
  }

  public getUsername(): string {
    return this.username;
  }

  public getPassword(): string {
    return this.password;
  }

  public getOrganization(): string {
    return this.organization;
  }

  public getBucket(): string {
    return this.bucket;
  }

  public getDatabase(): string | undefined {
    return this.database;
  }

  public getAdminToken(): string | undefined {
    return this.adminToken;
  }

  public isInfluxDB2(): boolean {
    return this.isVersion2;
  }

  /**
   * @returns The URL to connect to InfluxDB
   */
  public getUrl(): string {
    return `http://${this.getHost()}:${this.getPort()}`;
  }

  /**
   * @returns A connection string for InfluxDB
   */
  public getConnectionString(): string {
    if (this.isVersion2) {
      const params = new URLSearchParams({
        org: this.organization,
        bucket: this.bucket,
      });

      if (this.adminToken) {
        params.append("token", this.adminToken);
      }

      return `${this.getUrl()}?${params.toString()}`;
    } else {
      // InfluxDB 1.x connection string format
      const url = new URL(this.getUrl());
      url.username = this.username;
      url.password = this.password;
      if (this.database) {
        url.pathname = `/${this.database}`;
      }
      return url.toString();
    }
  }
}
