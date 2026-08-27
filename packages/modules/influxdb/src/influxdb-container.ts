import { AbstractStartedContainer, GenericContainer, StartedTestContainer, Wait } from "testcontainers";

const INFLUXDB_PORT = 8086;

interface InfluxDBConnectionDetails {
  version2: boolean;
  username: string;
  password: string;
  organization: string;
  bucket: string;
  adminToken?: string;
  database?: string;
}

/**
 * Testcontainers module for InfluxDB.
 *
 * Supports both InfluxDB 2.x (organization/bucket/token based) and the legacy
 * InfluxDB 1.x (database/user based). The major version is derived from the
 * image tag, so anything below `2` (or a non-numeric tag such as `latest`) is
 * treated as 2.x.
 */
export class InfluxDBContainer extends GenericContainer {
  private username = "test-user";
  private password = "test-password";

  // InfluxDB 2.x
  private organization = "test-org";
  private bucket = "test-bucket";
  private retention?: string;
  private adminToken?: string;

  // InfluxDB 1.x
  private database?: string;
  private authEnabled = true;
  private adminUsername = "admin";
  private adminPassword = "admin-password";

  constructor(image: string) {
    super(image);
    this.withExposedPorts(INFLUXDB_PORT)
      .withWaitStrategy(Wait.forHttp("/ping", INFLUXDB_PORT).forStatusCode(204))
      .withStartupTimeout(120_000);
  }

  public withUsername(username: string): this {
    this.username = username;
    return this;
  }

  public withPassword(password: string): this {
    this.password = password;
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

  public withDatabase(database: string): this {
    this.database = database;
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

  public override async start(): Promise<StartedInfluxDBContainer> {
    const version2 = isInfluxDB2(this.imageName.tag);
    this.withEnvironment(version2 ? this.influxDB2Environment() : this.influxDB1Environment());

    return new StartedInfluxDBContainer(await super.start(), {
      version2,
      username: this.username,
      password: this.password,
      organization: this.organization,
      bucket: this.bucket,
      adminToken: this.adminToken,
      database: this.database,
    });
  }

  private influxDB2Environment(): Record<string, string> {
    const environment: Record<string, string> = {
      DOCKER_INFLUXDB_INIT_MODE: "setup",
      DOCKER_INFLUXDB_INIT_USERNAME: this.username,
      DOCKER_INFLUXDB_INIT_PASSWORD: this.password,
      DOCKER_INFLUXDB_INIT_ORG: this.organization,
      DOCKER_INFLUXDB_INIT_BUCKET: this.bucket,
    };
    if (this.retention !== undefined) {
      environment.DOCKER_INFLUXDB_INIT_RETENTION = this.retention;
    }
    if (this.adminToken !== undefined) {
      environment.DOCKER_INFLUXDB_INIT_ADMIN_TOKEN = this.adminToken;
    }
    return environment;
  }

  private influxDB1Environment(): Record<string, string> {
    const environment: Record<string, string> = {
      INFLUXDB_HTTP_AUTH_ENABLED: String(this.authEnabled),
      INFLUXDB_ADMIN_USER: this.adminUsername,
      INFLUXDB_ADMIN_PASSWORD: this.adminPassword,
      INFLUXDB_USER: this.username,
      INFLUXDB_USER_PASSWORD: this.password,
    };
    if (this.database !== undefined) {
      environment.INFLUXDB_DB = this.database;
    }
    return environment;
  }
}

export class StartedInfluxDBContainer extends AbstractStartedContainer {
  constructor(
    startedTestContainer: StartedTestContainer,
    private readonly connectionDetails: InfluxDBConnectionDetails
  ) {
    super(startedTestContainer);
  }

  public getPort(): number {
    return this.getMappedPort(INFLUXDB_PORT);
  }

  /**
   * @returns the base HTTP URL of the InfluxDB instance, e.g. `http://localhost:32768`.
   */
  public getUrl(): string {
    return `http://${this.getHost()}:${this.getPort()}`;
  }

  /**
   * @returns `true` for InfluxDB 2.x, `false` for the legacy 1.x line.
   */
  public isInfluxDB2(): boolean {
    return this.connectionDetails.version2;
  }

  public getUsername(): string {
    return this.connectionDetails.username;
  }

  public getPassword(): string {
    return this.connectionDetails.password;
  }

  public getOrganization(): string {
    return this.connectionDetails.organization;
  }

  public getBucket(): string {
    return this.connectionDetails.bucket;
  }

  public getAdminToken(): string | undefined {
    return this.connectionDetails.adminToken;
  }

  public getDatabase(): string | undefined {
    return this.connectionDetails.database;
  }
}

function isInfluxDB2(tag: string): boolean {
  const majorVersion = Number.parseInt(tag, 10);
  return Number.isNaN(majorVersion) || majorVersion >= 2;
}
