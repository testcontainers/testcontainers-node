import { AbstractStartedContainer, GenericContainer, StartedTestContainer, Wait } from "testcontainers";

const INFLUXDB_PORT = 8086;

export class InfluxDB2Container extends GenericContainer {
  private username = "test-user";
  private password = "test-password";
  private organization = "test-org";
  private bucket = "test-bucket";
  private retention?: string;
  private adminToken = "test-token";

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

  public override async start(): Promise<StartedInfluxDB2Container> {
    if (this.password.length < 8) {
      throw new Error("InfluxDB 2.x password must be at least 8 characters long");
    }

    this.withEnvironment({
      DOCKER_INFLUXDB_INIT_MODE: "setup",
      DOCKER_INFLUXDB_INIT_USERNAME: this.username,
      DOCKER_INFLUXDB_INIT_PASSWORD: this.password,
      DOCKER_INFLUXDB_INIT_ORG: this.organization,
      DOCKER_INFLUXDB_INIT_BUCKET: this.bucket,
      DOCKER_INFLUXDB_INIT_ADMIN_TOKEN: this.adminToken,
      ...(this.retention !== undefined ? { DOCKER_INFLUXDB_INIT_RETENTION: this.retention } : {}),
    });

    return new StartedInfluxDB2Container(
      await super.start(),
      this.username,
      this.password,
      this.organization,
      this.bucket,
      this.adminToken
    );
  }
}

export class StartedInfluxDB2Container extends AbstractStartedContainer {
  constructor(
    startedTestContainer: StartedTestContainer,
    private readonly username: string,
    private readonly password: string,
    private readonly organization: string,
    private readonly bucket: string,
    private readonly adminToken: string
  ) {
    super(startedTestContainer);
  }

  public getPort(): number {
    return this.getMappedPort(INFLUXDB_PORT);
  }

  public getUrl(): string {
    return `http://${this.getHost()}:${this.getPort()}`;
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

  public getAdminToken(): string {
    return this.adminToken;
  }
}
